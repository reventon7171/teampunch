-- CreateTable
CREATE TABLE "DutyScheduleRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DutyScheduleRule_employeeId_weekday_key" ON "DutyScheduleRule"("employeeId", "weekday");

-- AddForeignKey
ALTER TABLE "DutyScheduleRule" ADD CONSTRAINT "DutyScheduleRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyScheduleRule" ADD CONSTRAINT "DutyScheduleRule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyScheduleRule" ADD CONSTRAINT "DutyScheduleRule_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DutyTaskOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

