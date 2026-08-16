import { Employee, Attendance, Leave, Holiday, Advance, Commission, DutyAssignment, DutyTaskOption, DayOffSwapRequest } from "@prisma/client";
import { PayrollEmployee } from "./payroll";

const num = (d: unknown): number | null => (d === null || d === undefined ? null : Number(d));

export const toPayrollEmployee = (emp: Employee): PayrollEmployee => ({
  id: emp.id,
  baseSalary: Number(emp.baseSalary),
  workStart: emp.workStart,
  workEnd: emp.workEnd,
  daysOff: emp.daysOff,
  hireDate: emp.hireDate,
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

export const serializeDayOffSwap = (s: DayOffSwapRequest) => ({
  id: s.id,
  employeeId: s.employeeId,
  originalOffDate: s.originalOffDate,
  swappedToDate: s.swappedToDate,
  reason: s.reason,
  status: s.status,
  createdAt: s.createdAt,
});
