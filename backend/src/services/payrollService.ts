import { Employee } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { toPayrollEmployee } from "../lib/serialize";
import { computePayroll, periodInfo, PayrollBreakdown, PayrollConfig } from "../lib/payroll";
import { todayStrBangkok } from "../lib/thaiTime";

// Assembles everything computePayroll needs for one employee + period, under the
// organization's configured pay frequency. Attendance/holiday/leave are scoped to the
// period's actual date range (not a calendar month) since a WEEKLY period can straddle two
// months — only the once-a-month Commission lookup still uses info.ym.
export const getPayrollForEmployee = async (
  config: PayrollConfig,
  emp: Employee,
  periodKey: string
): Promise<PayrollBreakdown> => {
  const info = periodInfo(periodKey, config);

  const [attendance, holidays, leaves, advance, commission, swaps, overtimeRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: info.startDate, lte: info.endDate } },
    }),
    prisma.holiday.findMany({
      where: { organizationId: emp.organizationId, date: { gte: info.startDate, lte: info.endDate } },
    }),
    prisma.leave.findMany({
      where: { employeeId: emp.id, status: "APPROVED", date: { gte: info.startDate, lte: info.endDate } },
    }),
    prisma.advance.findUnique({ where: { employeeId_periodKey: { employeeId: emp.id, periodKey } } }),
    prisma.commission.findUnique({ where: { employeeId_yearMonth: { employeeId: emp.id, yearMonth: info.ym } } }),
    // approved swaps can straddle a period boundary (originalOffDate/swappedToDate on either
    // side), so this is intentionally NOT scoped to the period's date range like the others
    prisma.dayOffSwapRequest.findMany({ where: { employeeId: emp.id, status: "APPROVED" } }),
    prisma.overtimeRequest.findMany({
      where: { employeeId: emp.id, status: "APPROVED", date: { gte: info.startDate, lte: info.endDate } },
    }),
  ]);

  return computePayroll(
    toPayrollEmployee(emp),
    periodKey,
    config,
    attendance.map((a) => ({
      employeeId: a.employeeId,
      date: a.date,
      checkInTime: a.checkInTime,
      lateMinutes: a.lateMinutes,
      deductionAmount: Number(a.deductionAmount),
    })),
    holidays.map((h) => ({ date: h.date, name: h.name })),
    leaves.map((l) => ({ employeeId: l.employeeId, date: l.date, type: l.type, status: l.status })),
    advance ? Number(advance.amount) : 0,
    commission ? Number(commission.amount) : 0,
    todayStrBangkok(),
    swaps.map((s) => ({
      employeeId: s.employeeId,
      originalOffDate: s.originalOffDate,
      swappedToDate: s.swappedToDate,
      status: s.status,
    })),
    overtimeRequests.map((o) => ({
      employeeId: o.employeeId,
      date: o.date,
      hours: Number(o.hours),
      status: o.status,
    }))
  );
};
