import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyPassword, hashPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { asyncHandler } from "../lib/asyncHandler";
import { loginSchema, registerOrgSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validators";
import { conflict, unauthorized, badRequest } from "../lib/errors";
import { serializeEmployee } from "../lib/serialize";
import { loginRateLimiter } from "../middleware/rateLimit";
import { slugify } from "../lib/slug";
import { generateResetCode, hashResetCode, RESET_CODE_TTL_MINUTES } from "../lib/resetCode";
import { sendEmail } from "../lib/email";

const router = Router();

// Public self-signup: creates a brand new Organization + its first Admin. No approval step,
// no payment — anyone can start using the app for their own business immediately.
router.post(
  "/admin/register",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const input = registerOrgSchema.parse(req.body);

    let slug = input.slug ? slugify(input.slug) : slugify(input.organizationName);
    // slug is how everyone at this org logs in, so it must be globally unique — if the
    // preferred one is taken, keep suffixing until we find a free one.
    for (let attempt = 0; await prisma.organization.findUnique({ where: { slug } }); attempt++) {
      if (input.slug && attempt === 0) throw conflict("รหัสร้าน/บริษัทนี้มีผู้ใช้แล้ว กรุณาเลือกรหัสอื่น");
      slug = `${slugify(input.organizationName)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const passwordHash = await hashPassword(input.adminPassword);

    const org = await prisma.organization.create({
      data: {
        name: input.organizationName,
        slug,
        admins: { create: { username: input.adminUsername, passwordHash } },
      },
      include: { admins: true },
    });
    const admin = org.admins[0];

    const token = signToken({ sub: admin.id, role: "admin", orgId: org.id });
    res.status(201).json({
      token,
      organization: { id: org.id, name: org.name, slug: org.slug },
      admin: { id: admin.id, username: admin.username },
    });
  })
);

router.post(
  "/admin/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { slug, username, password } = loginSchema.parse(req.body);
    const org = await prisma.organization.findUnique({ where: { slug } });
    const admin = org
      ? await prisma.admin.findUnique({ where: { organizationId_username: { organizationId: org.id, username } } })
      : null;
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw unauthorized("รหัสร้าน/บริษัท, ชื่อผู้ใช้ หรือรหัสผ่านแอดมินไม่ถูกต้อง");
    }
    const token = signToken({ sub: admin.id, role: "admin", orgId: admin.organizationId });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  })
);

router.post(
  "/employee/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { slug, username, password } = loginSchema.parse(req.body);
    const org = await prisma.organization.findUnique({ where: { slug } });
    const employee = org
      ? await prisma.employee.findUnique({
          where: { organizationId_username: { organizationId: org.id, username } },
        })
      : null;
    if (!employee || !employee.active || !(await verifyPassword(password, employee.passwordHash))) {
      throw unauthorized("รหัสร้าน/บริษัท, ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
    }
    const token = signToken({ sub: employee.id, role: "employee", orgId: employee.organizationId });
    res.json({ token, employee: serializeEmployee(employee) });
  })
);

// Always responds the same way regardless of whether the slug/username/email combo exists —
// otherwise this endpoint would let anyone probe which usernames exist at a given org.
router.post(
  "/admin/forgot-password",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { slug, username } = forgotPasswordSchema.parse(req.body);
    const org = await prisma.organization.findUnique({ where: { slug } });
    const admin = org
      ? await prisma.admin.findUnique({ where: { organizationId_username: { organizationId: org.id, username } } })
      : null;

    if (admin?.email) {
      const code = generateResetCode();
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          resetCodeHash: hashResetCode(code),
          resetCodeExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000),
        },
      });
      await sendEmail(
        admin.email,
        "รหัสยืนยันเพื่อตั้งรหัสผ่านใหม่ — TeamPunch",
        `<p>รหัสยืนยันของคุณคือ <b style="font-size:24px">${code}</b></p><p>ใช้ได้ภายใน ${RESET_CODE_TTL_MINUTES} นาที หากคุณไม่ได้ขอตั้งรหัสผ่านใหม่ ไม่ต้องดำเนินการใดๆ</p>`
      );
    }

    res.json({ message: "หากอีเมลนี้ผูกกับบัญชีแอดมิน เราได้ส่งรหัสยืนยันไปแล้ว" });
  })
);

router.post(
  "/admin/reset-password",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { slug, username, code, newPassword } = resetPasswordSchema.parse(req.body);
    const org = await prisma.organization.findUnique({ where: { slug } });
    const admin = org
      ? await prisma.admin.findUnique({ where: { organizationId_username: { organizationId: org.id, username } } })
      : null;

    if (
      !admin?.resetCodeHash ||
      !admin.resetCodeExpiresAt ||
      admin.resetCodeExpiresAt < new Date() ||
      admin.resetCodeHash !== hashResetCode(code)
    ) {
      throw badRequest("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash, resetCodeHash: null, resetCodeExpiresAt: null },
    });
    res.json({ ok: true });
  })
);

export default router;
