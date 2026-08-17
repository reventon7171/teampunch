-- AlterTable
-- isLifetimeFree defaults to true on this ADD COLUMN so every org that already exists gets
-- grandfathered in for free; the DEFAULT is then flipped to false so orgs created after this
-- migration start out on normal billing (once billing actually exists).
ALTER TABLE "Organization" ADD COLUMN     "isLifetimeFree" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "Organization" ALTER COLUMN "isLifetimeFree" SET DEFAULT false;
