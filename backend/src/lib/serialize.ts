import { Employee, Organization, Attendance, Leave, Holiday, Advance, Commission, DutyAssignment, DutyTaskOption, DutyScheduleRule, DayOffSwapRequest } from "@prisma/client";
import { PayrollEmployee, PayrollConfig } from "./payroll";

const num = (d: unknown): number | null => (d === null || d === undefined ? null : Number(d));

export const toPayrollEmployee = (emp: Employee): PayrollEmployee => ({
  id: emp.id,
  baseSalary: Number(emp.baseSalary),
  workStart: emp.workStart,
  workEnd: emp.workEnd,
  daysOff: emp.daysOff,
  hireDate: emp.hireDate,
  socialSecurityRate: Number(emp.socialSecurityRate),
});

export const toPayrollConfig = (org: Organization): PayrollConfig => ({
  frequency: org.payFrequency as PayrollConfig["frequency"],
  weeklyPayWeekday: org.weeklyPayWeekday,
  monthlyPayDay: org.monthlyPayDay,
  semiMonthlyPayDay1: org.semiMonthlyPayDay1,
  semiMonthlyPayDay2: org.semiMonthlyPayDay2,
});

export const serializePayrollConfig = (org: Organization) => ({
  payFrequency: org.payFrequency,
  weeklyPayWeekday: org.weeklyPayWeekday,
  monthlyPayDay: org.monthlyPayDay,
  semiMonthlyPayDay1: org.semiMonthlyPayDay1,
  semiMonthlyPayDay2: org.semiMonthlyPayDay2,
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
  dutyRotationEnabled: emp.dutyRotationEnabled,
  socialSecurityRate: Number(emp.socialSecurityRate),
  createdAt: emp.createdAt,
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

export const serializeDutyAssignment = (d: DutyAssignment & { taskOption: DutyTaskOption }) => ({
  id: d.id,
  employeeId: d.employeeId,
  date: d.date,
  taskId: d.taskId,
  label: d.taskOption.label,
  createdAt: d.createdAt,
});

export const serializeDutyTaskOption = (t: DutyTaskOption) => ({
  id: t.id,
  label: t.label,
  active: t.active,
  createdAt: t.createdAt,
});

export const serializeDutyScheduleRule = (r: DutyScheduleRule & { taskOption: DutyTaskOption }) => ({
  id: r.id,
  employeeId: r.employeeId,
  weekday: r.weekday,
  taskId: r.taskId,
  label: r.taskOption.label,
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
