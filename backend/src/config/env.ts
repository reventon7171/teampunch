import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("*"),
  SEED_ORG_NAME: z.string().default("ร้านตัวอย่าง"),
  SEED_ORG_SLUG: z.string().default("demo"),
  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_PASSWORD: z.string().default("admin1234"),

  // Cloudflare R2 (S3-compatible) photo storage — optional. When any is missing, storage.ts
  // falls back to local disk (fine for dev, NOT durable in production hosting). See README.md
  // "Photo storage (Cloudflare R2)" for how to create the bucket + access keys.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
