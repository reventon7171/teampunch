// Mirrors backend/src/lib/payroll.ts BONUS_AMOUNT — used only to label the UI.
export const BONUS_AMOUNT = 1500;

// Quick-pick suggestions for the position field — stored as free text on Employee.position
// (no backend enum), so admins can always type their own instead of picking one of these.
export const POSITIONS = ["ผู้จัดการ", "พนักงานขาย", "แคชเชียร์", "ครัว", "บริการลูกค้า", "พาร์ทไทม์"] as const;
