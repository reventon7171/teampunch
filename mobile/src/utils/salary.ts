// Display-only mirror of backend/src/lib/payroll.ts's dailyHours/hourlyRate, used purely to
// preview an employee's derived hourly rate in the admin employee list. The server always
// recomputes payroll amounts itself — this value is never sent back to the API.
const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const hourlyRateOf = (emp: { baseSalary: number; workStart: string; workEnd: string }): number => {
  const start = toMinutes(emp.workStart);
  let end = toMinutes(emp.workEnd);
  if (end <= start) end += 1440;
  const hours = Math.max((end - start) / 60, 0.01);
  return emp.baseSalary / 30 / hours;
};
