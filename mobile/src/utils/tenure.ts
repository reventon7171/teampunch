import { todayStr } from "./period";
import { formatThaiDate } from "./format";

// calendar-accurate elapsed years/months/days between hireDate and today (like an age calc)
export function tenureFromHireDate(
  hireDate: string,
  today: string = todayStr()
): { years: number; months: number; days: number } {
  const [hy, hm, hd] = hireDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);

  let years = ty - hy;
  let months = tm - hm;
  let days = td - hd;

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(ty, tm - 1, 0).getDate(); // day 0 of "tm" = last day of tm-1
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

// "2 ปี 3 เดือน 10 วัน" style summary for the admin employee list
export function formatTenure(hireDate: string | null | undefined, today: string = todayStr()): string {
  if (!hireDate) return "ไม่ระบุวันที่เริ่มงาน";
  if (hireDate > today) return `ยังไม่เริ่มงาน (เริ่ม ${formatThaiDate(hireDate)})`;

  const { years, months, days } = tenureFromHireDate(hireDate, today);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (months > 0) parts.push(`${months} เดือน`);
  if (days > 0 || parts.length === 0) parts.push(`${days} วัน`);
  return parts.join(" ");
}
