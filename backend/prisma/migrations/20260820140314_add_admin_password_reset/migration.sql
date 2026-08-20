-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "email" TEXT,
ADD COLUMN     "resetCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetCodeHash" TEXT;

