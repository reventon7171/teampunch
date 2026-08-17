export type WageType = "MONTHLY" | "DAILY_WAGE";

export interface Employee {
  id: string;
  name: string;
  position: string | null;
  baseSalary: number;
  workStart: string;
  workEnd: string;
  daysOff: number[];
  hireDate: string | null;
  username: string;
  active: boolean;
  socialSecurityRate: number;
  wageType: WageType;
  shiftId: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  hasCheckInPhoto: boolean;
  checkOutTime: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  hasCheckOutPhoto: boolean;
  lateMinutes: number;
  deductionHours: number;
  deductionAmount: number;
}

export type CheckInResult = AttendanceRecord;

export type LeaveType = "SICK" | "PERSONAL" | "VACATION";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DayOffSwapRequest {
  id: string;
  employeeId: string;
  originalOffDate: string;
  swappedToDate: string;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string;
  type: LeaveType;
  reason: string | null;
  hasPhoto: boolean;
  status: LeaveStatus;
  createdAt: string;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface PeriodInfo {
  periodKey: string;
  startDate: string;
  endDate: string;
  payDate: string;
  ym: string;
}

export interface PayrollBreakdown {
  info: PeriodInfo;
  wageType: WageType;
  periodSalary: number;
  periodDays: number;
  employedDays: number;
  daysWorkedInPeriod: number;
  lateCount: number;
  lateDeduction: number;
  leaveCount: number;
  leaveDeduction: number;
  absenceCount: number;
  dailyWageAbsenceDeduction: number;
  socialSecurityDeduction: number;
  advanceAmount: number;
  commissionAmount: number;
  isCommissionPeriod: boolean;
  otHours: number;
  otAmount: number;
  net: number;
}

export interface AdminPayrollRow extends PayrollBreakdown {
  employeeId: string;
  name: string;
  position: string | null;
}

export interface TodayStatus {
  date: string;
  record: AttendanceRecord | null;
  isOffToday: boolean;
  offReason:
    | { type: "holiday"; name: string }
    | { type: "leave"; leaveType: LeaveType }
    | { type: "weekly"; weekday: string }
    | { type: "swap" }
    | null;
}
