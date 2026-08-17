-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "dailyWageAbsenceDeductionAmount" DECIMAL(12,2),
ADD COLUMN     "dailyWageDeductAbsence" BOOLEAN NOT NULL DEFAULT false;

