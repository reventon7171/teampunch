import { Employee, Organization, Attendance, Leave, Holiday, Advance, Commission, DayOffSwapRequest, Shift, OvertimeRequest } from "@prisma/client";
import { PayrollEmployee, PayrollConfig, WageType } from "./payroll";

const num = (d: unknown): number | null => (d === null || d === undefined ? null : Number(d));

export const toPayrollEmployee = (emp: Employee): PayrollEmployee => ({
  id: emp.id,
  baseSalary: Number(emp.baseSalary),
  workStart: emp.workStart,
  workEnd: emp.workEnd,
  daysOff: emp.daysOff,
  hireDate: emp.hireDate,
  socialSecurityRate: Number(emp.socialSecurityRate),
  wageType: emp.wageType as WageType,
});

export const toPayrollConfig = (org: Organization): PayrollConfig => ({
  frequency: org.payFrequency as PayrollConfig["frequency"],
  weeklyPayWeekday: org.weeklyPayWeekday,
  monthlyPayDay: org.monthlyPayDay,
  semiMonthlyPayDay1: org.semiMonthlyPayDay1,
  semiMonthlyPayDay2: org.semiMonthlyPayDay2,
  dailyWageDeductAbsence: org.dailyWageDeductAbsence,
  dailyWageAbsenceDeductionAmount:
    org.dailyWageAbsenceDeductionAmount === null ? null : Number(org.dailyWageAbsenceDeductionAmount),
  otRateMultiplier: Number(org.otRateMultiplier),
});

export const serializePayrollConfig = (org: Organization) => ({
  payFrequency: org.payFrequency,
  weeklyPayWeekday: org.weeklyPayWeekday,
  monthlyPayDay: org.monthlyPayDay,
  semiMonthlyPayDay1: org.semiMonthlyPayDay1,
  semiMonthlyPayDay2: org.semiMonthlyPayDay2,
  lateDeductionFirstHour: org.lateDeductionFirstHour === null ? null : Number(org.lateDeductionFirstHour),
  lateDeductionPerExtraHour: org.lateDeductionPerExtraHour === null ? null : Number(org.lateDeductionPerExtraHour),
  dailyWageDeductAbsence: org.dailyWageDeductAbsence,
  dailyWageAbsenceDeductionAmount:
    org.dailyWageAbsenceDeductionAmount === null ? null : Number(org.dailyWageAbsenceDeductionAmount),
  otRateMultiplier: Number(org.otRateMultiplier),
});

export const serializeBilling = (org: Organization) => ({
  plan: org.plan,
  subscriptionStatus: org.subscriptionStatus,
  isLifetimeFree: org.isLifetimeFree,
});

export const serializeEmployee = (emp: Employee) => ({
  id: emp.id,
  name: emp.name,
  position: emp.position,
  baseSalary: Number(emp.baseSalary),
  workStart: emp.workStart,
  workEnd: emp.workEnd,
  daysOff: emp.daysOff,
  hireDate: emp.hireDate,
  username: emp.username,
  active: emp.active,
  socialSecurityRate: Number(emp.socialSecurityRate),
  wageType: emp.wageType,
  shiftId: emp.shiftId,
  createdAt: emp.createdAt,
});

export const serializeShift = (s: Shift) => ({
  id: s.id,
  name: s.name,
  startTime: s.startTime,
  endTime: s.endTime,
});

export const serializeAttendance = (a: Attendance) => ({
  id: a.id,
  employeeId: a.employeeId,
  date: a.date,
  checkInTime: a.checkInTime,
  checkInLat: num(a.checkInLat),
  checkInLng: num(a.checkInLng),
  hasCheckInPhoto: !!a.checkInPhotoPath,
  checkOutTime: a.checkOutTime,
  checkOutLat: num(a.checkOutLat),
  checkOutLng: num(a.checkOutLng),
  hasCheckOutPhoto: !!a.checkOutPhotoPath,
  lateMinutes: a.lateMinutes,
  deductionHours: a.deductionHours,
  deductionAmount: Number(a.deductionAmount),
});

export const serializeLeave = (l: Leave) => ({
  id: l.id,
  employeeId: l.employeeId,
  date: l.date,
  type: l.type,
  reason: l.reason,
  hasPhoto: !!l.photoPath,
  status: l.status,
  createdAt: l.createdAt,
});

export const serializeHoliday = (h: Holiday) => ({
  id: h.id,
  date: h.date,
  name: h.name,
});

export const serializeAdvance = (a: Advance) => ({
  employeeId: a.employeeId,
  periodKey: a.periodKey,
  amount: Number(a.amount),
  note: a.note,
});

export const serializeCommission = (c: Commission) => ({
  employeeId: c.employeeId,
  yearMonth: c.yearMonth,
  amount: Number(c.amount),
});

export const serializeOvertime = (o: OvertimeRequest) => ({
  id: o.id,
  employeeId: o.employeeId,
  date: o.date,
  startTime: o.startTime,
  endTime: o.endTime,
  hours: Number(o.hours),
  reason: o.reason,
  status: o.status,
  createdAt: o.createdAt,
});

export const serializeDayOffSwap = (s: DayOffSwapRequest) => ({
  id: s.id,
  employeeId: s.employeeId,
  originalOffDate: s.originalOffDate,
  swappedToDate: s.swappedToDate,
  reason: s.reason,
  status: s.status,
  createdAt: s.createdAt,
});
