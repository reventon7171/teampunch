-- CreateEnum
CREATE TYPE "DutyTask" AS ENUM ('BATHROOM', 'FLOOR_WALL', 'GLASS');

-- CreateTable
CREATE TABLE "DutyAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "task" "DutyTask" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DutyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DutyAssignment_date_idx" ON "DutyAssignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DutyAssignment_employeeId_date_key" ON "DutyAssignment"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "DutyAssignment" ADD CONSTRAINT "DutyAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
