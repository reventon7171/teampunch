import { Router } from "express";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload, resolveUploadPath } from "../lib/upload";
import { punchSchema, attendanceQuerySchema } from "../validators/attendance.validators";
import { serializeAttendance, serializeDutyAssignment, toPayrollEmployee } from "../lib/serialize";
import { badRequest, conflict, notFound, forbidden } from "../lib/errors";
import { todayStrBangkok, nowHHMMBangkok } from "../lib/thaiTime";
import { pickRandomDutyOption } from "../lib/duties";
import { syncPhotoToDrive } from "../lib/googleDrive";
import { distanceMeters } from "../lib/geo";
import {
  isDayOff,
  findApprovedLeave,
  computeLateMinutes,
  lateDeductionHours,
  hourlyRate,
  weekdayLabel,
  isCheckInTooEarly,
  isCheckOutTooLate,
  shiftDateStr,
} from "../lib/payroll";

const router = Router();
router.use(requireAuth);

// resolves the current employee row for the authenticated employee
const getSelfEmployee = async (employeeId: string) => {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp || !emp.active) throw notFound("พนักงาน");
  return emp;
};

// approved day-off swaps for this employee — small list, always fetched in full so
// isDayOff() can check both the originalOffDate and swappedToDate sides of any swap
const getApprovedSwaps = (employeeId: string) =>
  prisma.dayOffSwapRequest.findMany({ where: { employeeId, status: "APPROVED" } });

// the attendance row currently relevant to this employee: today's, or yesterday's if it's
// still open (checked in, no checkout yet) — covers overnight shifts (e.g. 17:50-01:00)
// where checkout happens after the calendar date has already rolled over to a new day
const getActiveAttendanceRecord = async (employeeId: string, today: string) => {
  const yesterday = shiftDateStr(today, -1);
  const [todayRecord, yesterdayRecord] = await Promise.all([
    prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } }),
    prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: yesterday } } }),
  ]);
  if (yesterdayRecord?.checkInTime && !yesterdayRecord.checkOutTime) {
    return { record: yesterdayRecord, date: yesterday };
  }
  return { record: todayRecord, date: today };
};

// server-side geofence — the source of truth, since client-side location can be spoofed.
// no-op if the admin hasn't configured a workplace location yet (or turned it off).
const assertWithinWorkplaceRadius = async (lat: number, lng: number) => {
  const loc = await prisma.workplaceLocation.findUnique({ where: { id: "default" } });
  if (!loc || !loc.enabled) return;
  const dist = distanceMeters(lat, lng, Number(loc.lat), Number(loc.lng));
  if (dist > loc.radiusMeters) {
    throw conflict(
      `คุณอยู่ห่างจากที่ทำงานเกินระยะที่กำหนด (ห่าง ${Math.round(dist)} เมตร, อนุญาต ${loc.radiusMeters} เมตร) กรุณาตอกบัตรเมื่ออยู่ที่ทำงาน`
    );
  }
};

router.post(
  "/check-in",
  requireRole("employee"),
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const { lat, lng } = punchSchema.parse(req.body);
    if (!req.file) throw badRequest("กรุณาถ่ายรูปยืนยันตัวตน");
    await assertWithinWorkplaceRadius(lat, lng);

    const emp = await getSelfEmployee(req.user!.id);
    const date = todayStrBangkok();
    const swaps = await getApprovedSwaps(emp.id);

    if (isDayOff(emp, emp.id, date, swaps)) {
      throw conflict(`วันนี้เป็นวันหยุดประจำสัปดาห์ (${weekdayLabel(new Date(date + "T00:00:00").getDay())}) ของคุณ`);
    }
    const holiday = await prisma.holiday.findUnique({ where: { date } });
    if (holiday) throw conflict(`วันนี้เป็นวันหยุดพิเศษ: ${holiday.name}`);

    const leaves = await prisma.leave.findMany({ where: { employeeId: emp.id, date, status: "APPROVED" } });
    const leave = findApprovedLeave(
      leaves.map((l) => ({ employeeId: l.employeeId, date: l.date, type: l.type, status: l.status })),
      emp.id,
      date
    );
    if (leave) throw conflict(`วันนี้คุณลาอยู่ (${leave.type})`);

    const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: emp.id, date } } });
    if (existing?.checkInTime) throw conflict("วันนี้ตอกบัตรเข้างานไปแล้ว");

    const time = nowHHMMBangkok();
    if (isCheckInTooEarly(emp.workStart, time)) {
      throw conflict(`เช็คอินได้ไม่เกิน 30 นาทีก่อนเวลาเข้างาน (${emp.workStart})`);
    }

    const payrollEmp = toPayrollEmployee(emp);
    const lateMinutes = computeLateMinutes(emp.workStart, time);
    const deductionHours = lateDeductionHours(lateMinutes);
    const deductionAmount = deductionHours * hourlyRate(payrollEmp);

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date } },
      create: {
        employeeId: emp.id,
        date,
        checkInTime: time,
        checkInLat: lat,
        checkInLng: lng,
        checkInPhotoPath: req.file.filename,
        lateMinutes,
        deductionHours,
        deductionAmount,
      },
      update: {
        checkInTime: time,
        checkInLat: lat,
        checkInLng: lng,
        checkInPhotoPath: req.file.filename,
        lateMinutes,
        deductionHours,
        deductionAmount,
      },
    });

    // assign today's cleaning duty for opted-in employees — random, but only once per employee
    // per day (upsert is a no-op if one was already assigned, e.g. a retried request)
    let duty = null;
    if (emp.dutyRotationEnabled) {
      const existingDuty = await prisma.dutyAssignment.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date } },
        include: { taskOption: true },
      });
      if (existingDuty) {
        duty = serializeDutyAssignment(existingDuty);
      } else {
        const option = await pickRandomDutyOption(prisma);
        if (option) {
          const dutyRecord = await prisma.dutyAssignment.create({
            data: { employeeId: emp.id, date, taskId: option.id },
            include: { taskOption: true },
          });
          duty = serializeDutyAssignment(dutyRecord);
        }
      }
    }

    // best-effort mirror to Google Drive — never awaited into the response, never blocks check-in
    syncPhotoToDrive(
      emp.id,
      resolveUploadPath(req.file.filename),
      `checkin_${date}_${time.replace(":", "-")}.jpg`,
      req.file.mimetype
    ).catch(() => {});

    res.status(201).json({ ...serializeAttendance(record), duty });
  })
);

router.post(
  "/check-out",
  requireRole("employee"),
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const { lat, lng } = punchSchema.parse(req.body);
    if (!req.file) throw badRequest("กรุณาถ่ายรูปยืนยันตัวตน");
    await assertWithinWorkplaceRadius(lat, lng);

    const emp = await getSelfEmployee(req.user!.id);
    const today = todayStrBangkok();
    const time = nowHHMMBangkok();

    const { record: existing, date } = await getActiveAttendanceRecord(emp.id, today);
    if (!existing?.checkInTime) throw badRequest("กรุณาตอกบัตรเข้างานก่อน");
    if (existing.checkOutTime) throw conflict("วันนี้ตอกบัตรออกงานไปแล้ว");

    if (isCheckOutTooLate(emp.workEnd, time)) {
      throw conflict(`เช็คเอาท์ได้ไม่เกิน 1 ชั่วโมงหลังเวลาเลิกงาน (${emp.workEnd})`);
    }

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutTime: time, checkOutLat: lat, checkOutLng: lng, checkOutPhotoPath: req.file.filename },
    });

    syncPhotoToDrive(
      emp.id,
      resolveUploadPath(req.file.filename),
      `checkout_${date}_${time.replace(":", "-")}.jpg`,
      req.file.mimetype
    ).catch(() => {});

    res.json(serializeAttendance(record));
  })
);

router.get(
  "/today",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const emp = await getSelfEmployee(req.user!.id);
    const date = todayStrBangkok();

    const [{ record, date: recordDate }, holiday, leaves, swaps] = await Promise.all([
      getActiveAttendanceRecord(emp.id, date),
      prisma.holiday.findUnique({ where: { date } }),
      prisma.leave.findMany({ where: { employeeId: emp.id, date, status: "APPROVED" } }),
      getApprovedSwaps(emp.id),
    ]);
    const dutyRecord = await prisma.dutyAssignment.findUnique({
      where: { employeeId_date: { employeeId: emp.id, date: recordDate } },
      include: { taskOption: true },
    });

    const swappedToToday = swaps.find((s) => s.swappedToDate === date);
    const dayOff = isDayOff(emp, emp.id, date, swaps);
    const leave = leaves[0] ?? null;
    const isOffToday = dayOff || !!holiday || !!leave;

    res.json({
      date,
      record: record ? serializeAttendance(record) : null,
      duty: dutyRecord ? serializeDutyAssignment(dutyRecord) : null,
      isOffToday,
      offReason: holiday
        ? { type: "holiday", name: holiday.name }
        : leave
        ? { type: "leave", leaveType: leave.type }
        : swappedToToday
        ? { type: "swap" }
        : dayOff
        ? { type: "weekly", weekday: weekdayLabel(new Date(date + "T00:00:00").getDay()) }
        : null,
    });
  })
);

router.get(
  "/me",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const { from, to } = attendanceQuerySchema.parse(req.query);
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: req.user!.id,
        date: { gte: from ?? undefined, lte: to ?? undefined },
      },
      orderBy: { date: "desc" },
    });
    res.json(records.map(serializeAttendance));
  })
);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { employeeId, from, to } = attendanceQuerySchema.parse(req.query);
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: employeeId ?? undefined,
        date: { gte: from ?? undefined, lte: to ?? undefined },
      },
      orderBy: { date: "desc" },
    });
    res.json(records.map(serializeAttendance));
  })
);

router.get(
  "/:id/photo/:kind",
  asyncHandler(async (req, res) => {
    const { id, kind } = req.params;
    if (kind !== "in" && kind !== "out") throw badRequest("ประเภทรูปไม่ถูกต้อง");

    const record = await prisma.attendance.findUnique({ where: { id } });
    if (!record) throw notFound("บันทึกการตอกบัตร");
    if (req.user!.role !== "admin" && req.user!.id !== record.employeeId) throw forbidden();

    const photoPath = kind === "in" ? record.checkInPhotoPath : record.checkOutPhotoPath;
    if (!photoPath) throw notFound("รูปถ่าย");

    const absPath = resolveUploadPath(photoPath);
    if (!fs.existsSync(absPath)) throw notFound("รูปถ่าย");
    res.sendFile(absPath);
  })
);

export default router;
