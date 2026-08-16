// Mirrors backend/src/lib/payroll.ts BONUS_AMOUNT — used only to label the UI.
export const BONUS_AMOUNT = 1500;

// Fixed set of job positions for บขส. บาร์ staff — stored as free text on Employee.position
// (no backend enum), so adding a new one later is just an edit here, no migration.
export const POSITION_SERVER = "เสิร์ฟ";
export const POSITIONS = ["ผู้จัดการ", "หัวหน้าพ่อครัว", "ผู้ช่วยพ่อครัว", "บาร์", POSITION_SERVER, "พาร์ทไทม์"] as const;
