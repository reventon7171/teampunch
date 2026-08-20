// Nightly database backup — meant to run as its own Railway Cron Job service (separate from
// the main API service), see HANDOFF.md for the exact Railway setup steps. Dumps the whole
// database with pg_dump, uploads it to the same R2 bucket used for photos (under a
// "backups/" prefix), then deletes old backups beyond RETENTION_COUNT so storage doesn't
// grow unbounded. Exits non-zero on any failure so a failed Cron run is visible in Railway.
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env";

const execFileAsync = promisify(execFile);

const RETENTION_COUNT = 14; // keep the last 14 nightly backups (~2 weeks)
const BACKUP_PREFIX = "backups/";

const isR2Configured = (): boolean =>
  !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);

const getClient = (): S3Client =>
  new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });

async function main() {
  if (!isR2Configured()) {
    throw new Error(
      "R2 not configured — cannot back up (need R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME)"
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const localPath = path.join(os.tmpdir(), `teampunch-${timestamp}.dump`);

  console.log("Running pg_dump...");
  await execFileAsync("pg_dump", [env.DATABASE_URL, "--format=custom", "--no-owner", "--file", localPath], {
    maxBuffer: 1024 * 1024 * 100,
  });

  const buffer = await fs.readFile(localPath);
  const key = `${BACKUP_PREFIX}teampunch-${timestamp}.dump`;
  const client = getClient();

  console.log(`Uploading ${key} (${(buffer.length / 1024 / 1024).toFixed(1)} MB) to R2...`);
  await client.send(
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: "application/octet-stream" })
  );
  await fs.unlink(localPath).catch(() => {});

  console.log("Cleaning up backups beyond retention...");
  const listed = await client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, Prefix: BACKUP_PREFIX }));
  // ISO-timestamped keys sort lexicographically the same as chronologically, so a plain
  // string sort (newest first) is enough — no need to look at LastModified
  const objects = (listed.Contents ?? []).filter((o) => o.Key).sort((a, b) => (a.Key! < b.Key! ? 1 : -1));
  const toDelete = objects.slice(RETENTION_COUNT);
  for (const obj of toDelete) {
    console.log(`Deleting old backup: ${obj.Key}`);
    await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: obj.Key! }));
  }

  console.log(`Backup complete: ${key}. ${objects.length - toDelete.length} backup(s) retained.`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
