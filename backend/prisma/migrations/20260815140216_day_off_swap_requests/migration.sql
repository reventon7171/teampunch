-- CreateTable
CREATE TABLE "DayOffSwapRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "originalOffDate" TEXT NOT NULL,
    "swappedToDate" TEXT NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayOffSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayOffSwapRequest_employeeId_idx" ON "DayOffSwapRequest"("employeeId");

-- CreateIndex
CREATE INDEX "DayOffSwapRequest_status_idx" ON "DayOffSwapRequest"("status");

-- AddForeignKey
ALTER TABLE "DayOffSwapRequest" ADD CONSTRAINT "DayOffSwapRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
