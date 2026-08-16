import crypto from "crypto";
import multer from "multer";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

// buffered in memory, then handed to storage.ts (R2 or local-disk fallback) — never written
// to disk directly here, so the same code path works whichever backend is active
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp, heic)"));
      return;
    }
    cb(null, true);
  },
});

// a fresh random object key/filename for a newly uploaded photo, scoped under the given prefix
export const randomPhotoKey = (prefix: string, mimeType: string): string => {
  const ext = EXT_BY_MIME[mimeType] || ".jpg";
  return `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
};
