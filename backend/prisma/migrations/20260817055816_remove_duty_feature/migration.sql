-- DropForeignKey
ALTER TABLE "DutyTaskOption" DROP CONSTRAINT "DutyTaskOption_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DutyScheduleRule" DROP CONSTRAINT "DutyScheduleRule_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DutyScheduleRule" DROP CONSTRAINT "DutyScheduleRule_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "DutyScheduleRule" DROP CONSTRAINT "DutyScheduleRule_taskId_fkey";

-- DropForeignKey
ALTER TABLE "DutyAssignment" DROP CONSTRAINT "DutyAssignment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DutyAssignment" DROP CONSTRAINT "DutyAssignment_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "DutyAssignment" DROP CONSTRAINT "DutyAssignment_taskId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "dutyRotationEnabled";

-- DropTable
DROP TABLE "DutyTaskOption";

-- DropTable
DROP TABLE "DutyScheduleRule";

-- DropTable
DROP TABLE "DutyAssignment";

