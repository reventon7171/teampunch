// All check-in/out timestamps and "today" boundaries are pinned to Asia/Bangkok,
// independent of the host server's own timezone (many hosts run UTC).
const TZ = "Asia/Bangkok";

const partsNow = (): Record<string, string> => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date())) map[part.type] = part.value;
  return map;
};

export const todayStrBangkok = (): string => {
  const p = partsNow();
  return `${p.year}-${p.month}-${p.day}`;
};

export const nowHHMMBangkok = (): string => {
  const p = partsNow();
  const hour = p.hour === "24" ? "00" : p.hour; // some ICU builds render midnight as "24"
  return `${hour}:${p.minute}`;
};
