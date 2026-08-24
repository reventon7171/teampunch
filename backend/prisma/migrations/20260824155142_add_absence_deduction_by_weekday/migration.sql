-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "absenceDeductionByWeekday" DECIMAL(12,2)[] DEFAULT ARRAY[0, 0, 0, 0, 0, 0, 0]::DECIMAL(12,2)[];
