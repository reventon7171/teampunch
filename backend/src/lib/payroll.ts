// Business logic ported from the prototype (punch_card_app_1.jsx) and since generalized so
// each organization can run its own pay cadence instead of bxs-bar's hardcoded
// 1st/16th-of-month schedule. Do not "simplify" the ladder/multiplier math for late/leave
// deductions — it is intentionally stepwise, not linear.

export type LeaveType = "SICK" | "PERSONAL" | "VACATION";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PayrollEmployee {
  id: string;
  baseSalary: number;
  workStart: string; // "HH:MM"
  workEnd: string; // "HH:MM", may be <= workStart for overnight shifts
  daysOff: number[]; // 0 (Sun) - 6 (Sat)
  hireDate: string | null; // "YYYY-MM-DD"; null only for legacy rows predating this field
  socialSecurityRate?: number; // % of this period's gross pay withheld (0-100). Defaults to 0.
}

export interface AttendanceRecord {
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  checkInTime: string | null;
  lateMinutes: number;
  deductionAmount: number;
}

export interface HolidayRecord {
  date: string;
  name: string;
}

export interface LeaveRecord {
  employeeId: string;
  date: string;
  type: LeaveType;
  status: LeaveStatus;
}

export interface DayOffSwapRecord {
  employeeId: string;
  originalOffDate: string; // "YYYY-MM-DD" — the normal weekly day off being given up, for this one week
  swappedToDate: string; // "YYYY-MM-DD" — the working day that becomes the day off instead
  status: LeaveStatus;
}

const DAYS_PER_MONTH_DIVISOR = 30; // the daily rate is always base salary / 30, every month, no exceptions
export const LEAVE_TYPES: LeaveType[] = ["SICK", "PERSONAL", "VACATION"];

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const dailyHours = (emp: Pick<PayrollEmployee, "workStart" | "workEnd">): number => {
  const start = toMinutes(emp.workStart);
  let end = toMinutes(emp.workEnd);
  if (end <= start) end += 1440; // shift crosses midnight (e.g. 17:50-01:00)
  return Math.max((end - start) / 60, 0.01);
};

export const dailyRate = (emp: Pick<PayrollEmployee, "baseSalary">): number =>
  emp.baseSalary / DAYS_PER_MONTH_DIVISOR;

export const hourlyRate = (
  emp: Pick<PayrollEmployee, "baseSalary" | "workStart" | "workEnd">
): number => dailyRate(emp) / dailyHours(emp);

// minutes late, handling shifts that cross midnight
export const computeLateMinutes = (workStart: string, checkinTime: string): number => {
  const start = toMinutes(workStart);
  const time = toMinutes(checkinTime);
  let diff = time - start;
  if (diff < -720) diff += 1440; // treat as still within the same overnight shift
  return Math.max(0, diff);
};

export const EARLY_CHECKIN_WINDOW_MINUTES = 30;
export const LATE_CHECKOUT_WINDOW_MINUTES = 60;

// signed minutes from `fromTime` to `toTime` (both "HH:MM"), wrapped to whichever direction
// is shorter — same trick as computeLateMinutes, so a pair of times close to midnight on
// either side of it still comes out as a small number instead of ~1440
const minutesBetween = (fromTime: string, toTime: string): number => {
  let diff = toMinutes(toTime) - toMinutes(fromTime);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return diff;
};

// true if `nowTime` is more than EARLY_CHECKIN_WINDOW_MINUTES minutes before `workStart` —
// blocks checking in hours ahead of a shift, while still allowing a reasonable early arrival
export const isCheckInTooEarly = (workStart: string, nowTime: string): boolean =>
  minutesBetween(nowTime, workStart) > EARLY_CHECKIN_WINDOW_MINUTES;

// true if `nowTime` is more than LATE_CHECKOUT_WINDOW_MINUTES minutes after `workEnd` —
// no early-side restriction, only a deadline for closing out the shift
export const isCheckOutTooLate = (workEnd: string, nowTime: string): boolean =>
  minutesBetween(workEnd, nowTime) > LATE_CHECKOUT_WINDOW_MINUTES;

// deduction in fixed 60-minute buckets counted from the first late minute:
// late 1-60 min = 1hr, 61-120 min = 2hr, 121-180 min = 3hr, and so on
export const lateDeductionHours = (lateMinutes: number): number => {
  if (lateMinutes < 1) return 0;
  return Math.ceil(lateMinutes / 60);
};

const WEEKDAYS = [
  { v: 0, label: "อาทิตย์" },
  { v: 1, label: "จันทร์" },
  { v: 2, label: "อังคาร" },
  { v: 3, label: "พุธ" },
  { v: 4, label: "พฤหัสบดี" },
  { v: 5, label: "ศุกร์" },
  { v: 6, label: "เสาร์" },
];
export const weekdayLabel = (v: number): string => WEEKDAYS.find((w) => w.v === v)?.label ?? "";

const dateAt = (dateStr: string): Date => new Date(dateStr + "T00:00:00");

export const isWeeklyDayOff = (
  emp: Pick<PayrollEmployee, "daysOff">,
  dateStr: string
): boolean => (emp.daysOff || []).includes(dateAt(dateStr).getDay());

// true if `dateStr` counts as this employee's day off, accounting for approved day-off
// swaps — a swap moves the day off from originalOffDate to swappedToDate for one specific
// week only (the employee's recurring weekly pattern in daysOff is unchanged)
export const isDayOff = (
  emp: Pick<PayrollEmployee, "daysOff">,
  employeeId: string,
  dateStr: string,
  swaps: DayOffSwapRecord[]
): boolean => {
  const approved = swaps.filter((s) => s.employeeId === employeeId && s.status === "APPROVED");
  if (approved.some((s) => s.originalOffDate === dateStr)) return false;
  if (approved.some((s) => s.swappedToDate === dateStr)) return true;
  return isWeeklyDayOff(emp, dateStr);
};

export const findHoliday = (
  holidays: HolidayRecord[],
  dateStr: string
): HolidayRecord | undefined => holidays.find((h) => h.date === dateStr);

export const findApprovedLeave = (
  leaves: LeaveRecord[],
  employeeId: string,
  dateStr: string
): LeaveRecord | undefined =>
  leaves.find((l) => l.employeeId === employeeId && l.date === dateStr && l.status === "APPROVED");

// ลาป่วย = หัก 1 วัน (ค่าแรงต่อวัน)
// ลากิจ = จันทร์-พฤหัส หัก 1.5 เท่าของค่าแรงต่อวัน, ศุกร์-เสาร์-อาทิตย์ หัก 2 เท่า
// ลาพักร้อน = ลาแบบได้รับค่าจ้าง ไม่หักเงิน
export const leaveDeductionAmount = (
  emp: Pick<PayrollEmployee, "baseSalary">,
  leave: Pick<LeaveRecord, "type" | "date">
): number => {
  const rate = dailyRate(emp);
  if (leave.type === "SICK") return rate;
  if (leave.type === "PERSONAL") {
    const day = dateAt(leave.date).getDay(); // 0=อาทิตย์...6=เสาร์
    const isMonThu = day >= 1 && day <= 4;
    return isMonThu ? rate * 1.5 : rate * 2;
  }
  return 0;
};

// formats a Date using its LOCAL calendar fields — never .toISOString(), which round-trips
// through UTC and silently shifts the date backward by a day in any timezone ahead of UTC
// (e.g. Asia/Bangkok, UTC+7: local midnight Aug 10 is still Aug 9 in UTC)
const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayStr = (): string => toDateStr(new Date());

// shifts a "YYYY-MM-DD" by a number of calendar days (negative to go backward) — used to look
// up "yesterday" when an overnight shift's checkout happens after the calendar date has rolled
export const shiftDateStr = (dateStr: string, deltaDays: number): string => {
  const d = dateAt(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return toDateStr(d);
};

const daysBetweenInclusive = (startDate: string, endDate: string): number =>
  Math.round((dateAt(endDate).getTime() - dateAt(startDate).getTime()) / 86400000) + 1;

// count days in [startDate, endDate] (inclusive, capped to today, and never before the
// employee's hireDate — someone hired mid-period was not employed yet on the earlier days,
// so those are not absences) where the employee has no attendance check-in, is not on a
// weekly day off, not a company holiday, and has no approved leave
export const countAbsencesInRange = (
  emp: Pick<PayrollEmployee, "id" | "daysOff" | "hireDate">,
  startDate: string,
  endDate: string,
  attendance: AttendanceRecord[],
  holidays: HolidayRecord[],
  leaves: LeaveRecord[],
  today: string = todayStr(),
  swaps: DayOffSwapRecord[] = []
): number => {
  const cappedEnd = endDate > today ? today : endDate;
  const cappedStart = emp.hireDate && emp.hireDate > startDate ? emp.hireDate : startDate;
  if (cappedEnd < cappedStart) return 0; // period hasn't started yet, or employee wasn't hired yet
  let count = 0;
  let cur = dateAt(cappedStart);
  const last = dateAt(cappedEnd);
  while (cur <= last) {
    const dateStr = toDateStr(cur);
    if (
      !isDayOff(emp, emp.id, dateStr, swaps) &&
      !findHoliday(holidays, dateStr) &&
      !findApprovedLeave(leaves, emp.id, dateStr)
    ) {
      const rec = attendance.find((a) => a.employeeId === emp.id && a.date === dateStr);
      if (!rec || !rec.checkInTime) count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

// ---------- pay periods (configurable per organization) ----------

export type PayFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "SEMI_MONTHLY";

export interface PayrollConfig {
  frequency: PayFrequency;
  weeklyPayWeekday: number; // 0 (Sun) - 6 (Sat) — payday when frequency=WEEKLY
  monthlyPayDay: number; // 1-28 — payday (of the following month) when frequency=MONTHLY
  semiMonthlyPayDay1: number; // 1-28 — payday for the 1st-15th period when frequency=SEMI_MONTHLY
  semiMonthlyPayDay2: number; // 1-28 — payday (of the following month) for the 16th-end period
}

// bxs-bar's original hardcoded schedule (paid the 16th and the 1st) — used as the default for
// any organization that hasn't configured its own cadence yet.
export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  frequency: "SEMI_MONTHLY",
  weeklyPayWeekday: 5,
  monthlyPayDay: 1,
  semiMonthlyPayDay1: 16,
  semiMonthlyPayDay2: 1,
};

export interface PeriodInfo {
  periodKey: string;
  startDate: string;
  endDate: string;
  payDate: string;
  ym: string; // calendar month the period's END date falls in — used only to look up the
  // once-a-month Commission record, not to compute deductions/pay (those use startDate/endDate)
}

const pad2 = (n: number): string => String(n).padStart(2, "0");
const lastDayOfMonth = (y: number, m: number): number => new Date(y, m, 0).getDate();

export const periodKeyFromDate = (dateStr: string, config: PayrollConfig): string => {
  switch (config.frequency) {
    case "DAILY":
      return dateStr;
    case "WEEKLY": {
      // periodKey is the END date of the 7-day block containing dateStr, anchored to
      // weeklyPayWeekday — e.g. payday=Fri means every block runs Sat...Fri
      const dow = dateAt(dateStr).getDay();
      const daysUntilEnd = (config.weeklyPayWeekday - dow + 7) % 7;
      return shiftDateStr(dateStr, daysUntilEnd);
    }
    case "MONTHLY":
      return dateStr.slice(0, 7); // "YYYY-MM"
    case "SEMI_MONTHLY":
    default: {
      const ym = dateStr.slice(0, 7);
      const day = Number(dateStr.slice(8, 10));
      return `${ym}-${day <= 15 ? "H1" : "H2"}`;
    }
  }
};

export const periodInfo = (periodKey: string, config: PayrollConfig): PeriodInfo => {
  switch (config.frequency) {
    case "DAILY":
      return { periodKey, startDate: periodKey, endDate: periodKey, payDate: periodKey, ym: periodKey.slice(0, 7) };

    case "WEEKLY": {
      const endDate = periodKey; // stored as the block's end date (the payday's weekday)
      const startDate = shiftDateStr(endDate, -6);
      return { periodKey, startDate, endDate, payDate: endDate, ym: endDate.slice(0, 7) };
    }

    case "MONTHLY": {
      const [yStr, mStr] = periodKey.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const startDate = `${yStr}-${mStr}-01`;
      const endDate = `${yStr}-${mStr}-${pad2(lastDayOfMonth(y, m))}`;
      let payY = y;
      let payM = m + 1;
      if (payM > 12) {
        payM = 1;
        payY += 1;
      }
      const payDate = `${payY}-${pad2(payM)}-${pad2(config.monthlyPayDay)}`;
      return { periodKey, startDate, endDate, payDate, ym: periodKey };
    }

    case "SEMI_MONTHLY":
    default: {
      const [yStr, mStr, half] = periodKey.split("-") as [string, string, "H1" | "H2"];
      const y = Number(yStr);
      const m = Number(mStr);
      const startDate = half === "H1" ? `${yStr}-${mStr}-01` : `${yStr}-${mStr}-16`;
      const endDate = half === "H1" ? `${yStr}-${mStr}-15` : `${yStr}-${mStr}-${pad2(lastDayOfMonth(y, m))}`;
      let payY = y;
      let payM = m;
      let payD: number;
      if (half === "H1") {
        payD = config.semiMonthlyPayDay1;
      } else {
        payD = config.semiMonthlyPayDay2;
        payM = m + 1;
        if (payM > 12) {
          payM = 1;
          payY += 1;
        }
      }
      const payDate = `${payY}-${pad2(payM)}-${pad2(payD)}`;
      return { periodKey, startDate, endDate, payDate, ym: `${yStr}-${mStr}` };
    }
  }
};

export const shiftPeriod = (periodKey: string, delta: number, config: PayrollConfig): string => {
  switch (config.frequency) {
    case "DAILY":
      return shiftDateStr(periodKey, delta);

    case "WEEKLY":
      return shiftDateStr(periodKey, delta * 7);

    case "MONTHLY": {
      const [y, m] = periodKey.split("-").map(Number);
      const idx = y * 12 + (m - 1) + delta;
      const newY = Math.floor(idx / 12);
      const newM = (idx % 12) + 1;
      return `${newY}-${pad2(newM)}`;
    }

    case "SEMI_MONTHLY":
    default: {
      const [yStr, mStr, half] = periodKey.split("-") as [string, string, "H1" | "H2"];
      const y = Number(yStr);
      const m = Number(mStr);
      const idx = y * 24 + (m - 1) * 2 + (half === "H1" ? 0 : 1) + delta;
      const newY = Math.floor(idx / 24);
      const rem = idx - newY * 24;
      const newM = Math.floor(rem / 2) + 1;
      const newHalf: "H1" | "H2" = rem % 2 === 0 ? "H1" : "H2";
      return `${newY}-${pad2(newM)}-${newHalf}`;
    }
  }
};

export interface PayrollBreakdown {
  info: PeriodInfo;
  periodSalary: number; // gross base pay for this period, pro-rated for a mid-period hire
  periodDays: number;
  employedDays: number;
  lateCount: number;
  lateDeduction: number;
  leaveCount: number;
  leaveDeduction: number;
  absenceCount: number;
  socialSecurityDeduction: number;
  advanceAmount: number;
  commissionAmount: number;
  isCommissionPeriod: boolean; // true if this period is the one covering the month's last
  // day, i.e. where that month's Commission (still set once a month by the admin) is paid out
  net: number;
}

// full payroll breakdown for one employee for one pay period, under the organization's
// configured pay frequency.
export const computePayroll = (
  emp: PayrollEmployee,
  periodKey: string,
  config: PayrollConfig,
  attendance: AttendanceRecord[],
  holidays: HolidayRecord[],
  leaves: LeaveRecord[],
  advanceAmount: number,
  commissionAmount: number,
  today: string = todayStr(),
  swaps: DayOffSwapRecord[] = []
): PayrollBreakdown => {
  const info = periodInfo(periodKey, config);

  // pro-rate a mid-period hire: someone who started partway through the period did not work
  // every day of it, so they should not be paid as if they had. Employees hired before (or
  // on) the period's first day get the full period salary, unaffected.
  const periodDays = daysBetweenInclusive(info.startDate, info.endDate);
  let employedDays = periodDays;
  if (emp.hireDate && emp.hireDate > info.endDate) {
    employedDays = 0; // not hired yet during this period at all
  } else if (emp.hireDate && emp.hireDate > info.startDate) {
    employedDays = daysBetweenInclusive(emp.hireDate, info.endDate);
  }
  const fraction = periodDays > 0 ? employedDays / periodDays : 0;

  // the period's full (un-prorated) gross pay: a flat half/whole of the monthly base salary
  // for SEMI_MONTHLY/MONTHLY (so it's unaffected by short months like February), or the daily
  // rate times the period length for WEEKLY/DAILY (there's no clean "always exactly X" flat
  // figure for those, unlike a calendar half-month or month).
  const fullPeriodSalary =
    config.frequency === "SEMI_MONTHLY"
      ? emp.baseSalary / 2
      : config.frequency === "MONTHLY"
      ? emp.baseSalary
      : dailyRate(emp) * periodDays;
  const periodSalary = fullPeriodSalary * fraction;

  const periodRecs = attendance.filter(
    (a) => a.employeeId === emp.id && a.date >= info.startDate && a.date <= info.endDate
  );
  const lateCount = periodRecs.filter((r) => r.lateMinutes >= 1).length;
  const lateDeduction = periodRecs.reduce((s, r) => s + (r.deductionAmount || 0), 0);

  const periodApprovedLeaves = leaves.filter(
    (l) =>
      l.employeeId === emp.id &&
      l.status === "APPROVED" &&
      l.date >= info.startDate &&
      l.date <= info.endDate
  );
  const leaveCount = periodApprovedLeaves.length;
  const leaveDeduction = periodApprovedLeaves.reduce((s, l) => s + leaveDeductionAmount(emp, l), 0);

  const absenceCount = countAbsencesInRange(
    emp,
    info.startDate,
    info.endDate,
    attendance,
    holidays,
    leaves,
    today,
    swaps
  );

  const socialSecurityDeduction = Math.max(0, periodSalary * ((emp.socialSecurityRate ?? 0) / 100));

  // commission is still set by the admin once per calendar month (Commission.yearMonth) — it's
  // disbursed on whichever pay period covers that month's last calendar day, generalizing the
  // old "always the 2nd half" rule to any frequency
  const [monthY, monthM] = info.startDate.slice(0, 7).split("-").map(Number);
  const monthEndDate = `${info.startDate.slice(0, 7)}-${pad2(lastDayOfMonth(monthY, monthM))}`;
  const isCommissionPeriod = info.startDate <= monthEndDate && info.endDate >= monthEndDate;
  const commission = isCommissionPeriod ? commissionAmount : 0;

  const net = periodSalary - lateDeduction - leaveDeduction - socialSecurityDeduction - advanceAmount + commission;

  return {
    info,
    periodSalary,
    periodDays,
    employedDays,
    lateCount,
    lateDeduction,
    leaveCount,
    leaveDeduction,
    absenceCount,
    socialSecurityDeduction,
    advanceAmount,
    commissionAmount: commission,
    isCommissionPeriod,
    net,
  };
};
