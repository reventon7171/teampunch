import crypto from "crypto";

export const RESET_CODE_TTL_MINUTES = 15;

// 6-digit numeric code, e.g. "042817" — short enough to type on a phone, emailed in the clear
// but only ever stored hashed (see hashResetCode)
export const generateResetCode = (): string => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

// sha256 is enough here (not bcrypt): the code is short-lived (15 min), single-use, and
// already rate-limited at the route layer — this just keeps the plain code out of the database
export const hashResetCode = (code: string): string => crypto.createHash("sha256").update(code).digest("hex");
