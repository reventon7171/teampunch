import fs from "fs";
import { google, drive_v3 } from "googleapis";
import { env } from "../config/env";
import { prisma } from "./prisma";

// Google Drive photo sync is entirely optional — if any of the three GOOGLE_OAUTH_* vars
// are missing, every call below is a silent no-op. Local disk (backend/uploads/) remains
// the source of truth the app actually serves photos from; Drive is a best-effort mirror
// for HR/admin to browse, organized one folder per employee.
//
// IMPORTANT for the multi-tenant fork: this whole feature is a SINGLE Drive account shared
// process-wide, not scoped per Organization — enabling it would mirror every tenant's
// check-in photos into one operator-owned Drive, which is a cross-tenant privacy leak. Leave
// GOOGLE_OAUTH_* unset (the default) so it stays a no-op until it's redesigned to be
// per-organization (e.g. each org connects its own Drive/Google Workspace).
//
// Uses OAuth2 with the shop owner's own Google account (not a service account) — service
// accounts have no storage quota of their own outside a paid Google Workspace "Shared Drive",
// so files created directly by one fail. Authorizing as a real account sidesteps that and
// works with a plain free Gmail account. Run `npm run drive:auth` once to get the refresh
// token (see scripts/googleDriveAuth.ts and README.md).
const ROOT_FOLDER_NAME = "TeamPunch - รูปตอกบัตร";

let driveClient: drive_v3.Drive | null = null;
let rootFolderIdCache: string | null = null;
let warnedNotConfigured = false;

const isConfigured = (): boolean =>
  !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REFRESH_TOKEN);

const getDriveClient = (): drive_v3.Drive => {
  if (driveClient) return driveClient;
  const auth = new google.auth.OAuth2(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
};

// finds (or creates, on first-ever sync) the app's root folder in the authorized account's
// own Drive — no manual "create + share a folder" step needed, unlike the service-account approach
const getOrCreateRootFolder = async (): Promise<string> => {
  if (rootFolderIdCache) return rootFolderIdCache;
  const drive = getDriveClient();
  const list = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });
  let folderId = list.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: { name: ROOT_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = created.data.id ?? undefined;
  }
  if (!folderId) throw new Error("Google Drive did not return a root folder id");
  rootFolderIdCache = folderId;
  return folderId;
};

// finds this employee's Drive folder, creating it under the root on first use and caching
// the id on Employee.driveFolderId so we never create duplicates
const getOrCreateEmployeeFolder = async (employeeId: string): Promise<string> => {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new Error(`syncPhotoToDrive: employee ${employeeId} not found`);
  if (emp.driveFolderId) return emp.driveFolderId;

  const rootId = await getOrCreateRootFolder();
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: `${emp.name} (${emp.username})`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    fields: "id",
  });
  const folderId = res.data.id;
  if (!folderId) throw new Error("Google Drive did not return a folder id");
  await prisma.employee.update({ where: { id: employeeId }, data: { driveFolderId: folderId } });
  return folderId;
};

// fire-and-forget from route handlers (never awaited into the response) — never throws,
// so a Drive outage or misconfiguration can never break check-in/check-out/leave submission
export const syncPhotoToDrive = async (
  employeeId: string,
  localFilePath: string,
  driveFileName: string,
  mimeType: string
): Promise<void> => {
  if (!isConfigured()) {
    if (!warnedNotConfigured) {
      console.log(
        "Google Drive sync not configured (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN) — skipping"
      );
      warnedNotConfigured = true;
    }
    return;
  }
  try {
    const folderId = await getOrCreateEmployeeFolder(employeeId);
    const drive = getDriveClient();
    await drive.files.create({
      requestBody: { name: driveFileName, parents: [folderId] },
      media: { mimeType, body: fs.createReadStream(localFilePath) },
      fields: "id",
    });
  } catch (err) {
    console.error("Google Drive sync failed:", err instanceof Error ? err.message : err);
  }
};
