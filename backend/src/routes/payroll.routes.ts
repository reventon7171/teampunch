import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { periodQuerySchema, setAdvanceSchema, setCommissionSchema } from "../validators/payroll.validators";
import { getPayrollForEmployee } from "../services/payrollService";
import { periodKeyFromDate } from "../lib/payroll";
import { todayStrBangkok } from "../lib/thaiTime";
import { serializeAdvance, serializeCommission, toPayrollConfig } from "../lib/serialize";
import { notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/me",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const [org, emp] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      prisma.employee.findFirst({ where: { id: req.user!.id, organizationId } }),
    ]);
    if (!emp) throw notFound("พนักงาน");
    const config = toPayrollConfig(org);
    const { period } = periodQuerySchema.parse(req.query);
    const periodKey = period ?? periodKeyFromDate(todayStrBangkok(), config);
    const breakdown = await getPayrollForEmployee(config, emp, periodKey);
    res.json(breakdown);
  })
);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const [org, employees] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      prisma.employee.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } }),
    ]);
    const config = toPayrollConfig(org);
    const { period } = periodQuerySchema.parse(req.query);
    const periodKey = period ?? periodKeyFromDate(todayStrBangkok(), config);
    const rows = await Promise.all(
      employees.map(async (emp) => ({
        employeeId: emp.id,
        name: emp.name,
        position: emp.position,
        ...(await getPayrollForEmployee(config, emp, periodKey)),
      }))
    );
    res.json(rows);
  })
);

router.put(
  "/advance",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = setAdvanceSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, organizationId } });
    if (!employee) throw notFound("พนักงาน");
    const advance = await prisma.advance.upsert({
      where: { employeeId_periodKey: { employeeId: input.employeeId, periodKey: input.periodKey } },
      create: { organizationId, employeeId: input.employeeId, periodKey: input.periodKey, amount: input.amount, note: input.note },
      update: { amount: input.amount, note: input.note },
    });
    res.json(serializeAdvance(advance));
  })
);

router.put(
  "/commission",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = setCommissionSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, organizationId } });
    if (!employee) throw notFound("พนักงาน");
    const commission = await prisma.commission.upsert({
      where: { employeeId_yearMonth: { employeeId: input.employeeId, yearMonth: input.yearMonth } },
      create: { organizationId, employeeId: input.employeeId, yearMonth: input.yearMonth, amount: input.amount },
      update: { amount: input.amount },
    });
    res.json(serializeCommission(commission));
  })
);

export default router;
