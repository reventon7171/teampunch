import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  const orgName = process.env.SEED_ORG_NAME || "ร้านตัวอย่าง";
  const orgSlug = process.env.SEED_ORG_SLUG || slugify(orgName) || "demo";
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin1234";

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    create: { name: orgName, slug: orgSlug },
    update: {},
  });
  console.log(`Organization ready: ${org.name} (slug: ${org.slug})`);

  const adminPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  await prisma.admin.upsert({
    where: { organizationId_username: { organizationId: org.id, username: adminUsername } },
    create: { organizationId: org.id, username: adminUsername, passwordHash: adminPasswordHash },
    update: {},
  });
  console.log(
    `Admin account ready: slug="${org.slug}" username="${adminUsername}" password="${adminPassword}" (โปรดเปลี่ยนรหัสผ่านหลัง login ครั้งแรก)`
  );

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return toDateStr(d);
  };
  // mid-month hire this month — demonstrates the "joined partway through a pay period" case
  const midMonthThisMonth = () => {
    const d = new Date();
    d.setDate(20);
    if (d > new Date()) d.setMonth(d.getMonth() - 1); // don't hire in the future
    return toDateStr(d);
  };

  const sampleEmployees = [
    {
      name: "สมชาย ใจดี",
      position: "ช่างเทคนิค",
      baseSalary: 18000,
      workStart: "08:00",
      workEnd: "17:00",
      daysOff: [1],
      username: "somchai",
      password: "1234",
      hireDate: monthsAgo(24),
    },
    {
      name: "มะลิ วงศ์สุข",
      position: "ฝ่ายขาย",
      baseSalary: 22000,
      workStart: "09:30",
      workEnd: "18:30",
      daysOff: [2],
      username: "mali",
      password: "1234",
      hireDate: monthsAgo(6),
    },
    {
      name: "วิชัย รุ่งเรือง",
      position: "รปภ. (กะดึก)",
      baseSalary: 6500,
      workStart: "17:50",
      workEnd: "01:00",
      daysOff: [3],
      username: "wichai",
      password: "1234",
      hireDate: midMonthThisMonth(),
    },
  ];

  for (const e of sampleEmployees) {
    const existing = await prisma.employee.findUnique({
      where: { organizationId_username: { organizationId: org.id, username: e.username } },
    });
    if (existing) {
      if (!existing.hireDate) {
        await prisma.employee.update({ where: { id: existing.id }, data: { hireDate: e.hireDate } });
      }
      continue;
    }
    const passwordHash = await bcrypt.hash(e.password, SALT_ROUNDS);
    await prisma.employee.create({
      data: {
        organizationId: org.id,
        name: e.name,
        position: e.position,
        baseSalary: e.baseSalary,
        workStart: e.workStart,
        workEnd: e.workEnd,
        daysOff: e.daysOff,
        hireDate: e.hireDate,
        username: e.username,
        passwordHash,
      },
    });
  }
  console.log(`Seeded ${sampleEmployees.length} sample employees (password "1234" for all)`);

  const today = new Date();
  const sampleHolidayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-15`;
  await prisma.holiday.upsert({
    where: { organizationId_date: { organizationId: org.id, date: sampleHolidayDate } },
    create: { organizationId: org.id, date: sampleHolidayDate, name: "วันหยุดพิเศษตัวอย่าง" },
    update: {},
  });
  console.log(`Seeded sample holiday on ${sampleHolidayDate}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
