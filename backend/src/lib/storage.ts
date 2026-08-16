import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env";

// Photo storage for check-in/check-out/leave photos, scoped per organization
// (key prefix "org/{organizationId}/...") so one tenant can never read another's photos.
//
// Cloudflare R2 (S3-compatible) is the production backend — it's a bucket owned by the app
// itself, not any individual's personal cloud account, and survives redeploys (unlike the
// backend's own ephemeral disk on most hosts). When R2 isn't configured (e.g. local dev),
// falls back to local disk under backend/uploads/ automatically so `npm run dev` still works
// without any cloud credentials.
const isR2Configured = (): boolean =>
  !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);

let s3Client: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  return s3Client;
};

const LOCAL_DIR = path.join(__dirname, "..", "..", "uploads");
let warnedLocalFallback = false;
const ensureLocalDir = () => fs.mkdirSync(LOCAL_DIR, { recursive: true });
// photo keys are "org/{id}/..." with slashes — flatten to a safe local filename
const localFilePath = (key: string) => path.join(LOCAL_DIR, key.replace(/\//g, "__"));

export const savePhoto = async (key: string, buffer: Buffer, contentType: string): Promise<void> => {
  if (isR2Configured()) {
    await getS3Client().send(
      new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType })
    );
    return;
  }
  if (!warnedLocalFallback) {
    console.log("R2 not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME) — storing photos on local disk instead (fine for dev, NOT durable in production)");
    warnedLocalFallback = true;
  }
  ensureLocalDir();
  await fs.promises.writeFile(localFilePath(key), buffer);
};

// returns null if the photo doesn't exist (caller responds 404)
export const readPhoto = async (
  key: string
): Promise<{ stream: Readable; contentType?: string } | null> => {
  if (isR2Configured()) {
    try {
      const res = await getS3Client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
      if (!res.Body) return null;
      return { stream: res.Body as Readable, contentType: res.ContentType };
    } catch (err: any) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }
  const abs = localFilePath(key);
  if (!fs.existsSync(abs)) return null;
  return { stream: fs.createReadStream(abs) };
};
