// Client-side mirror of the same period math in backend/src/lib/payroll.ts — used here only
// for labeling/navigating periods in the UI, never for computing money (the server is the
// only source of truth for payroll amounts).
export type PayFrequency = "WEEKLY" | "MONTHLY" | "SEMI_MONTHLY";

export interface PayrollConfig {
  payFrequency: PayFrequency;
  weeklyPayWeekday: number;
  monthlyPayDay: number;
  semiMonthlyPayDay1: number;
  semiMonthlyPayDay2: number;
  // null = derive the late deduction from each employee's hourly rate (the original
  // behavior). A number switches the whole org to a flat baht amount instead.
  lateDeductionFirstHour: number | null;
  lateDeductionPerExtraHour: number | null;
}

// bxs-bar's original hardcoded schedule (paid the 16th and the 1st) — used until the real
// config loads from the server.
export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  payFrequency: "SEMI_MONTHLY",
  weeklyPayWeekday: 5,
  monthlyPayDay: 1,
  semiMonthlyPayDay1: 16,
  semiMonthlyPayDay2: 1,
  lateDeductionFirstHour: null,
  lateDeductionPerExtraHour: null,
};

export interface PeriodInfo {
  periodKey: string;
  startDate: string;
  endDate: string;
  payDate: string;
  ym: string;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");
const dateAt = (dateStr: string): Date => new Date(dateStr + "T00:00:00");
const lastDayOfMonth = (y: number, m: number): number => new Date(y, m, 0).getDate();

// local calendar date, never .toISOString() — that round-trips through UTC and shifts the
// date backward a day in timezones ahead of UTC (e.g. Asia/Bangkok, UTC+7)
const toDateStr = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const shiftDateStr = (dateStr: string, deltaDays: number): string => {
  const d = dateAt(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return toDateStr(d);
};

export const periodKeyFromDate = (dateStr: string, config: PayrollConfig): string => {
  switch (config.payFrequency) {
    case "WEEKLY": {
      const dow = dateAt(dateStr).getDay();
      const daysUntilEnd = (config.weeklyPayWeekday - dow + 7) % 7;
      return shiftDateStr(dateStr, daysUntilEnd);
    }
    case "MONTHLY":
      return dateStr.slice(0, 7);
    case "SEMI_MONTHLY":
    default: {
      const ym = dateStr.slice(0, 7);
      const day = Number(dateStr.slice(8, 10));
      return `${ym}-${day <= 15 ? "H1" : "H2"}`;
    }
  }
};

export const periodInfo = (periodKey: string, config: PayrollConfig): PeriodInfo => {
  switch (config.payFrequency) {
    case "WEEKLY": {
      const endDate = periodKey;
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
  switch (config.payFrequency) {
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

const formatThaiDayMonthYear = (dateStr: string): string =>
  dateAt(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export const periodLabel = (periodKey: string, config: PayrollConfig): { rangeLabel: string; payLabel: string } => {
  const info = periodInfo(periodKey, config);
  const payLabel = `จ่ายวันที่ ${formatThaiDayMonthYear(info.payDate)}`;

  const sameMonth = info.startDate.slice(0, 7) === info.endDate.slice(0, 7);
  if (sameMonth) {
    const monthYear = dateAt(info.endDate).toLocaleDateString("th-TH", { month: "short", year: "numeric" });
    const startDay = Number(info.startDate.slice(8, 10));
    const endDay = Number(info.endDate.slice(8, 10));
    return { rangeLabel: `${startDay}–${endDay} ${monthYear}`, payLabel };
  }
  return { rangeLabel: `${formatThaiDayMonthYear(info.startDate)} – ${formatThaiDayMonthYear(info.endDate)}`, payLabel };
};

export const todayStr = (): string => toDateStr(new Date());
