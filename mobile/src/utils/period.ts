// Client-side mirror of the same period math in backend/src/lib/payroll.ts — used here only
// for labeling/navigating periods in the UI, never for computing money (the server is the
// only source of truth for payroll amounts).
export interface PeriodInfo {
  y: number;
  m: number;
  half: "H1" | "H2";
  startDate: string;
  endDate: string;
  payDate: string;
  ym: string;
}

export const periodInfo = (periodKey: string): PeriodInfo => {
  const [yStr, mStr, half] = periodKey.split("-") as [string, string, "H1" | "H2"];
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = half === "H1" ? `${yStr}-${mStr}-01` : `${yStr}-${mStr}-16`;
  const endDate =
    half === "H1" ? `${yStr}-${mStr}-15` : `${yStr}-${mStr}-${String(lastDay).padStart(2, "0")}`;
  let payY = y;
  let payM = m;
  let payD: number;
  if (half === "H1") {
    payD = 16;
  } else {
    payD = 1;
    payM = m + 1;
    if (payM > 12) {
      payM = 1;
      payY = y + 1;
    }
  }
  const payDate = `${payY}-${String(payM).padStart(2, "0")}-${String(payD).padStart(2, "0")}`;
  return { y, m, half, startDate, endDate, payDate, ym: `${yStr}-${mStr}` };
};

export const periodKeyFromDate = (dateStr: string): string => {
  const ym = dateStr.slice(0, 7);
  const day = Number(dateStr.slice(8, 10));
  return `${ym}-${day <= 15 ? "H1" : "H2"}`;
};

export const shiftPeriod = (periodKey: string, delta: number): string => {
  const { y, m, half } = periodInfo(periodKey);
  const idx = y * 24 + (m - 1) * 2 + (half === "H1" ? 0 : 1) + delta;
  const newY = Math.floor(idx / 24);
  const rem = idx - newY * 24;
  const newM = Math.floor(rem / 2) + 1;
  const newHalf: "H1" | "H2" = rem % 2 === 0 ? "H1" : "H2";
  return `${newY}-${String(newM).padStart(2, "0")}-${newHalf}`;
};

const formatThaiMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { month: "short", year: "numeric" });
};

export const periodLabel = (periodKey: string): { rangeLabel: string; payLabel: string } => {
  const info = periodInfo(periodKey);
  const monthYear = formatThaiMonthYear(info.startDate);
  const rangeLabel = info.half === "H1" ? `1–15 ${monthYear}` : `16–${info.endDate.slice(8, 10)} ${monthYear}`;
  const payD = new Date(info.payDate + "T00:00:00");
  const payLabel = `จ่ายวันที่ ${payD.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`;
  return { rangeLabel, payLabel };
};

// local calendar date, never .toISOString() — that round-trips through UTC and shifts the
// date backward a day in timezones ahead of UTC (e.g. Asia/Bangkok, UTC+7)
export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
