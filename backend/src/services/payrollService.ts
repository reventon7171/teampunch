import { Employee } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { toPayrollEmployee } from "../lib/serialize";
import { computePayroll, periodInfo, PayrollBreakdown } from "../lib/payroll";
import { todayStrBangkok } from "../lib/thaiTime";

// Assembles everything computePayroll needs for one employee + period, scoped to the
// calendar month the period falls in (bonus eligibility is judged over the whole month).
export const getPayrollForEmployee = async (
  emp: Employee,
  periodKey: string
): Promise<PayrollBreakdown> => {
  const info = periodInfo(periodKey);

  const [attendance, holidays, leaves, advance, commission, swaps] = await Promise.all([
    prisma.attendance.findMany({ where: { employeeId: emp.id, date: { startsWith: info.ym } } }),
    prisma.holiday.findMany({ where: { organizationId: emp.organizationId, date: { startsWith: info.ym } } }),
    prisma.leave.findMany({ where: { employeeId: emp.id, status: "APPROVED", date: { startsWith: info.ym } } }),
    prisma.advance.findUnique({ where: { employeeId_periodKey: { employeeId: emp.id, periodKey } } }),
    prisma.commission.findUnique({ where: { employeeId_yearMonth: { employeeId: emp.id, yearMonth: info.ym } } }),
    // approved swaps can straddle a month boundary (originalOffDate/swappedToDate on either
    // side), so this is intentionally NOT scoped to info.ym like the other queries above
    prisma.dayOffSwapRequest.findMany({ where: { employeeId: emp.id, status: "APPROVED" } }),
  ]);

  return computePayroll(
    toPayrollEmployee(emp),
    periodKey,
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
    }))
  );
};
