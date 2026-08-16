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
  dutyRotationEnabled: boolean;
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

export interface DutyAssignment {
  id: string;
  employeeId: string;
  date: string;
  taskId: string;
  label: string;
  createdAt: string;
}

export interface DutyTaskOption {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
}

export interface CheckInResult extends AttendanceRecord {
  duty: DutyAssignment | null;
}

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

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface PeriodInfo {
  y: number;
  m: number;
  half: "H1" | "H2";
  startDate: string;
  endDate: string;
  payDate: string;
  ym: string;
}

export interface PayrollBreakdown {
  info: PeriodInfo;
  halfSalary: number;
  periodDays: number;
  employedDays: number;
  lateCount: number;
  lateDeduction: number;
  leaveCount: number;
  leaveDeduction: number;
  absenceCount: number;
  monthLateCount: number;
  monthLeaveCount: number;
  monthAbsenceCount: number;
  advanceAmount: number;
  commissionAmount: number;
  bonus: number;
  bonusEligible: boolean;
  isPayoutHalf: boolean;
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
  duty: DutyAssignment | null;
  isOffToday: boolean;
  offReason:
    | { type: "holiday"; name: string }
    | { type: "leave"; leaveType: LeaveType }
    | { type: "weekly"; weekday: string }
    | { type: "swap" }
    | null;
}
