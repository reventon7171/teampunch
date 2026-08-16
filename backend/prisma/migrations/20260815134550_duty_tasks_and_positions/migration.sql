-- Per-employee duty rotation opt-in, replacing the hardcoded position === 'เสิร์ฟ' check
ALTER TABLE "Employee" ADD COLUMN "dutyRotationEnabled" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Employee" SET "dutyRotationEnabled" = true WHERE "position" = 'เสิร์ฟ';

-- Admin-managed duty task options, replacing the fixed DutyTask enum
CREATE TABLE "DutyTaskOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DutyTaskOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DutyTaskOption_label_key" ON "DutyTaskOption"("label");

-- seed from the old fixed enum values so existing history keeps working
INSERT INTO "DutyTaskOption" ("id", "label") VALUES
  ('24db1b40-d05a-4fdd-91c2-8686c3b9a803', 'ขัดห้องน้ำ/โถส้วม'),
  ('90b858d9-836a-4163-a4f5-0a787cfaa5d3', 'ทำความสะอาดพื้นและผนัง'),
  ('ef65bcc8-5b0b-45ab-b68f-689c9ec8b66d', 'เช็ดกระจกหน้าร้าน/กระจกหน้าห้องน้ำ');

-- add the new FK column, backfill it from the old enum column, then swap over
ALTER TABLE "DutyAssignment" ADD COLUMN "taskId" TEXT;

UPDATE "DutyAssignment"
SET "taskId" = CASE "task"
  WHEN 'BATHROOM' THEN '24db1b40-d05a-4fdd-91c2-8686c3b9a803'
  WHEN 'FLOOR_WALL' THEN '90b858d9-836a-4163-a4f5-0a787cfaa5d3'
  WHEN 'GLASS' THEN 'ef65bcc8-5b0b-45ab-b68f-689c9ec8b66d'
END;

ALTER TABLE "DutyAssignment" ALTER COLUMN "taskId" SET NOT NULL;
ALTER TABLE "DutyAssignment" DROP COLUMN "task";
DROP TYPE "DutyTask";

ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DutyTaskOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
