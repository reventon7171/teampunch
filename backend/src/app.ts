import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employees.routes";
import attendanceRoutes from "./routes/attendance.routes";
import leaveRoutes from "./routes/leaves.routes";
import holidayRoutes from "./routes/holidays.routes";
import payrollRoutes from "./routes/payroll.routes";
import payrollSettingsRoutes from "./routes/payrollSettings.routes";
import adminRoutes from "./routes/admin.routes";
import dayOffSwapRoutes from "./routes/dayOffSwaps.routes";
import billingRoutes from "./routes/billing.routes";
import shiftRoutes from "./routes/shifts.routes";
import overtimeRoutes from "./routes/overtime.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payroll-settings", payrollSettingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/day-off-swaps", dayOffSwapRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/overtime", overtimeRoutes);

app.use((_req, res) => res.status(404).json({ error: "ไม่พบ endpoint นี้" }));
app.use(errorHandler);
