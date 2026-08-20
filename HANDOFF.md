# TeamPunch — สรุปสำหรับทำงานต่อ

เอกสารนี้เขียนไว้ให้วางเป็นข้อความแรกในเซสชัน Claude Code ใหม่ได้เลย (หรือให้ Claude อ่านไฟล์นี้ก่อน) ไม่ต้องเล่าบริบทซ้ำ

---

## 1. โปรเจกต์นี้คืออะไร

**TeamPunch** = แอปเช็คอินพนักงาน + คำนวณเงินเดือน แบบ **multi-tenant SaaS สาธารณะ** — ใครก็สมัครใช้เองได้ฟรี หลายกิจการใช้ระบบเดียวกันได้ (แต่ละกิจการ = 1 Organization แยกข้อมูลกันเด็ดขาด)

Fork มาจากแอปเช็คอินพนักงานเดิมของ **บขส. บาร์** (single-tenant, private, ยังใช้งานจริงอยู่ — **ห้ามแตะ/กระทบเด็ดขาด**, อยู่คนละโฟลเดอร์/repo/deploy กันหมดแล้ว ดูหัวข้อ 6)

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL — REST API
mobile/     Expo + React Native + TypeScript — แอพมือถือ (แอดมิน + พนักงาน)
```

## 2. สถานะ deploy ปัจจุบัน

| ส่วน | ที่อยู่ |
|---|---|
| Source code | https://github.com/reventon7171/teampunch (private repo, บัญชี `reventon7171`) |
| Backend (live) | `https://teampunch-production.up.railway.app` — Railway, deploy อัตโนมัติเมื่อ push ขึ้น GitHub branch `main` |
| Database | Railway Postgres (โปรเจกต์เดียวกับ backend) |
| Photo storage | Cloudflare R2 (bucket `teampunch-photo`) — ตั้งค่าไว้แล้วใน Railway env vars |
| Mobile EAS project | `@reventon13/teampunch` (บัญชี Expo `reventon13`, ไม่ใช่ `bks-bar`) |
| Bundle ID | `com.teampunch.app` |
| APK ล่าสุดที่ build ไว้ | https://expo.dev/artifacts/eas/yYmotpQLngd3wdfU4nhSLzj27881PaN3JD3XDyAXZh8.apk *(เก่ากว่าโค้ดปัจจุบันมาก ต้อง build ใหม่ก่อนถ้าจะทดสอบบนมือถือจริง)* |

**⚠️ สำคัญมาก — pattern การทำงานที่ต้องรู้:**
Claude Code ใน session นี้ **push ขึ้น GitHub เองไม่ได้** (ระบบ auto-mode classifier บล็อกไว้) ทุกครั้งที่แก้โค้ดเสร็จ ต้อง**ให้ผู้ใช้ (Ton) รันเองในเทอร์มินัลของเขา**:
```bash
cd "/Users/ton/Downloads/TeamPunch"
git push
```
แล้ว Railway จะ auto-deploy เอง (ใช้เวลา ~1-2 นาที) — เคยเกิดปัญหาหลายรอบที่ลืม push แล้วงงว่าทำไมฟีเจอร์ใหม่ไม่ขึ้นในแอป (เพราะ backend ที่ deploy อยู่เป็นโค้ดเก่า) **ให้เตือน/เช็คเรื่องนี้ทุกครั้งที่ทำฟีเจอร์เสร็จ**

## 3. บัญชี/ผู้ใช้ที่เกี่ยวข้อง

- Email หลัก: `wuttiwat.pint@gmail.com`
- GitHub: `reventon7171` (personal, ใช้กับ repo นี้)
- Expo/EAS: `reventon13` (personal account — **ไม่ใช่** `bks-bar` ซึ่งเป็นของ บขส.)
- Railway: บัญชี personal ของ Ton (โปรเจกต์ `resilient-benevolence`)
- Cloudflare: บัญชี personal, ผูกบัตรแล้วเพื่อเปิด R2 (free tier, ยังไม่เคยเกิน quota)

## 4. Multi-tenancy — กลไกหลัก

- ทุกตารางมี `organizationId` scope ทุก query ทุก route แล้ว
- Login ต้องใช้ **slug** (รหัสร้าน/บริษัท) + username + password เพราะ username unique แค่ภายใน org เดียวกัน ไม่ unique ทั้งระบบ
- สมัครใหม่ผ่าน `POST /api/auth/admin/register` (หรือหน้า "สมัครใช้งานฟรี" ในแอพ) — สร้าง Organization ใหม่ + Admin คนแรก ฟรี ไม่มี approval

## 5. ฟีเจอร์ที่ทำเสร็จในเซสชันนี้ (เรียงตามลำดับ)

1. Fork จาก บขส. บาร์ → multi-tenant, rebrand เป็น "TeamPunch" (โทนสีเขียวมิ้นต์-ส้ม)
2. Google Drive photo sync → เปลี่ยนเป็น Cloudflare R2 (org-scoped, ไม่ผูกกับ email ใครคนใดคนหนึ่ง)
3. หน้าจอ admin ดูรูปเช็คอิน/เอกสารลาย้อนหลัง (ก่อนหน้านี้ทำไม่ได้เลยแม้แต่ในแอปเดิม)
4. ระบบหน้าที่ประจำวัน (duty rotation) → **ทำแล้วลบทิ้งทั้งหมดตามคำขอ** (ไม่มีในแอปแล้ว)
5. เปลี่ยนช่องกรอกวันที่/เวลาแบบพิมพ์เอง → เป็นแบบแตะเลือก (ChoiceModal/DateField/TimeField, ไม่ใช้ native picker เพื่อไม่ต้อง rebuild)
6. **ระบบเงินเดือนแบบยืดหยุ่นเต็มรูปแบบ** (งานใหญ่สุดของเซสชันนี้):
   - เลือกความถี่จ่ายเงินได้: รายสัปดาห์ / รายเดือน (1 ครั้ง) / แบ่งจ่าย 2 งวด/เดือน — ตั้งค่าที่ **ตั้งค่า → รอบการจ่ายเงินเดือน**
   - งวดจ่าย 2 ครั้ง/เดือน เป็นแบบ **cutoff-to-payday**: งวดนับตั้งแต่วันถัดจากวันจ่ายก่อนหน้า ถึงวันจ่ายนี้ (จ่ายวันเดียวกับวันสิ้นสุดงวด) เช่น ตั้ง 5/20 → งวด 5 คลุม 21 เดือนก่อน–5, งวด 20 คลุม 6–20
   - พนักงานเลือกได้ระหว่าง **รายเดือน** (เงินเดือนคงที่ หารครึ่ง/เดือนตามงวด) กับ **รายวัน** (มาวันไหนได้เงินวันนั้น ไม่มาไม่ได้ ไม่มีหักสาย/หักลาซ้อน)
   - หักประกันสังคม: % ต่อพนักงาน คำนวณจากเงินที่จ่ายในงวดนั้น
   - หักสายมาสาย: กำหนดเองได้เป็นบาทคงที่ (ชั่วโมงแรก + ชั่วโมงถัดไป) แทนการคำนวณจากค่าแรงรายชั่วโมง (ค่าเริ่มต้น = ยังคำนวณจากรายชั่วโมงเหมือนเดิม)
   - พนักงานรายวัน: เลือกได้ว่าจะหักเงินเพิ่มวันที่ขาดงานหรือไม่ (ปกติไม่หักเพราะไม่ได้เงินอยู่แล้ว) ถ้าเปิดใช้ระบุจำนวนบาทเอง
   - **ตัดโบนัสอัตโนมัติทั้งเดือนออกทั้งหมด** ตามคำขอ (ยังมีค่าคอมมิชชั่นที่แอดมินตั้งเองได้ต่อเดือนอยู่)
7. ซ่อนปุ่มเปลี่ยนรหัสผ่านแอดมินให้เป็นลิงก์เล็กๆ (ลดความรก)
8. **โครงสร้างระบบเก็บเงิน (billing) — ยังไม่บังคับใช้จริง**:
   - เพิ่ม `Organization.plan` (default `"free"`), `subscriptionStatus` (default `"active"`), `isLifetimeFree` (Boolean) ใน schema
   - Migration `add_billing_fields` แก้ default ของ `isLifetimeFree` เป็น `true` ตอน ADD COLUMN แล้วค่อยเปลี่ยน default กลับเป็น `false` — เพื่อให้ทุก org ที่มีอยู่ก่อน migration นี้ถูก mark เป็นฟรีถาวรอัตโนมัติ ส่วน org ใหม่หลังจากนี้จะไม่ใช่ฟรีถาวรโดย default
   - Backend: `GET /api/billing` (แอดมินเท่านั้น, read-only) คืนค่า plan/subscriptionStatus/isLifetimeFree — ยังไม่มี endpoint แก้ไข เพราะยังไม่ต่อ payment gateway
   - Mobile: การ์ด "แพ็กเกจการใช้งาน" ในหน้าตั้งค่าแอดมิน แสดงสถานะเฉยๆ (ยังไม่มีปุ่มอัปเกรด/ชำระเงิน)
   - **ยังไม่เชื่อม Omise/Opn Payments จริง** — เป็นแค่โครงสร้างข้อมูล + UI เปล่าๆ รอวันเปิดใช้งาน ดูหัวข้อ 7 สำหรับแผนต่อ
   - `isLifetimeFree` default = `true` ในระดับ schema ด้วย (ไม่ใช่แค่ backfill ตอน migration) เพราะตอนนี้ยังอยู่ช่วงส่งให้เพื่อนๆ ทดลองใช้ก่อนเปิดตัวจริง สมัครใหม่กี่ org ก็ยังฟรีถาวรหมดจนกว่าจะพร้อมเปิดระบบเก็บเงินจริง — **ตอนพร้อมเปิดบิลลิ่งจริง ต้องเปลี่ยน default นี้กลับเป็น `false`** ก่อน (แก้ที่ `backend/prisma/schema.prisma` แล้ว generate migration ใหม่ด้วยขั้นตอนในหัวข้อ 8)
9. **เอาล็อคเวลาเช็คอินออก + ระบบกะการทำงาน (shift)**:
   - ลบข้อจำกัด "เช็คอินได้ไม่เกิน 30 นาทีก่อนเวลาเข้างาน" ออกทั้งหมด (`isCheckInTooEarly` — ลบทั้งฟังก์ชันและเทสต์) พนักงานเช็คอินเวลาไหนก็ได้ตอนนี้ ค่าสาย/หักเงินยังคำนวณตามเดิม (เทียบกับ `workStart` เหมือนเดิม) — **เช็คเอาท์ยังล็อคอยู่เหมือนเดิม** (ห้ามเกิน 1 ชม. หลังเวลาเลิกงาน, `isCheckOutTooLate` ไม่ได้แตะ)
   - โมเดลใหม่ `Shift` (org-scoped, สูงสุด **3 กะต่อกิจการ** บังคับที่ backend): id, name, startTime, endTime — จัดการที่ **ตั้งค่าแอดมิน → กะการทำงาน**
   - `Employee.shiftId` (optional FK → Shift) — `workStart`/`workEnd` ยังเป็น source of truth ที่ payroll/attendance ใช้จริงเหมือนเดิมทั้งหมด การเลือกกะแค่ copy เวลาจากกะนั้นลงไปที่ 2 ฟิลด์นี้ ไม่ได้เปลี่ยน logic คำนวณเงินเดือน/สายเลย
   - แอดมิน: ตอนสร้าง/แก้ไขพนักงาน เลือกกะจาก chip ได้ (หรือกำหนดเวลาเองแบบเดิมถ้าไม่ตั้งกะ) — endpoint `POST/PATCH /api/employees` รับ `shiftId` เพิ่ม
   - พนักงาน: กด "เปลี่ยนกะ" ที่หน้าตอกบัตร (PunchScreen) เลือกกะจากลิสต์ที่แอดมินตั้งไว้ได้เอง ผ่าน `PUT /api/employees/me/shift` — ใช้เคสตามที่ขอ: ครึ่งเดือนแรกกะเช้า ครึ่งเดือนหลังกะบ่าย พนักงานสลับเองได้ไม่ต้องรอแอดมิน
   - Backend endpoints ใหม่: `GET/POST/PATCH/DELETE /api/shifts` (GET เปิดให้ทั้ง admin/employee อ่านได้ เพราะพนักงานต้องเห็นลิสต์กะเพื่อเลือก, เขียนได้เฉพาะ admin)
10. **ระบบ OT (ค่าล่วงเวลา) — แบบง่าย อัตราเดียวทั้งองค์กร**:
   - ค้นวิธี HumanSoft ทำ OT มาก่อน (8 ประเภท OT, ปัดเศษเอง, แยกอัตราวันทำงาน/วันหยุด 1.5x/3x/2x) — ตัดสินใจไม่ทำตามนั้นเพราะซับซ้อนเกินความจำเป็นของ SME เล็ก เลือกทำแบบง่ายสุดแทน
   - `Organization.otRateMultiplier` (Decimal, default **1.5**) — อัตราเดียวทั้งองค์กร คูณกับค่าแรง/ชม. ของพนักงานแต่ละคน ไม่แยกวันทำงานปกติ/วันหยุด ไม่มีปัดเศษ/ขั้นต่ำนาทีแบบ HumanSoft — ตั้งค่าที่ **ตั้งค่าแอดมิน → รอบการจ่ายเงินเดือน → อัตราจ่าย OT**
   - โมเดลใหม่ `OvertimeRequest` (org+employee scoped): date, startTime, endTime, hours (คำนวณจาก start/end ตอนส่งคำขอ เก็บไว้เลย ไม่คำนวณใหม่ทีหลัง), reason, status (PENDING/APPROVED/REJECTED เหมือน Leave) — รองรับ OT ข้ามเที่ยงคืนด้วย (`overtimeDurationHours` ใน `payroll.ts`)
   - พนักงาน: ยื่นคำขอ OT ได้ที่แท็บ "ลางาน" (โหมดใหม่ "ขอ OT") ระบุวันที่ + เวลาเริ่ม-สิ้นสุด — endpoint `POST /api/overtime`
   - แอดมิน: อนุมัติ/ปฏิเสธ/ลบคำขอ OT ที่หน้า "คำขอลา" (โหมดใหม่ "คำขอ OT") — endpoint `PATCH /api/overtime/:id/status`
   - **เฉพาะ OT ที่อนุมัติแล้วเท่านั้น** ที่ถูกรวมเข้าเงินเดือน คิดจาก `computePayroll`'s `otHours`/`otAmount` แสดงในหน้าเงินเดือนทั้งฝั่งพนักงาน (MyPayrollScreen) และแอดมิน (AdminPayrollScreen)
   - **แอดมินกรอกจำนวนเงิน OT เองได้ตอนอนุมัติ** — `OvertimeRequest.approvedAmount` (nullable) ตอนแอดมินกด "อนุมัติ" ในแอป จะมีช่องกรอกบาทเติมให้อัตโนมัติจากสูตร (ชม. × ค่าแรง/ชม. × `otRateMultiplier`) แต่แก้ตัวเลขเองก่อนกดยืนยันได้ ถ้าแก้ `approvedAmount` จะถูกใช้แทนสูตรตอนคำนวณเงินเดือน (ถ้า null = ใช้สูตรตามปกติ) — ปฏิเสธคำขอจะล้างค่านี้ทิ้งเสมอ กันเลขค้างจากรอบอนุมัติเก่า
   - ยังไม่ทำ: แยกอัตราวันหยุด/วันทำงาน, เพดานชั่วโมง OT ต่อครั้ง, ปัดเศษเวลา, การอนุมัติหลายระดับ — ถ้าจะทำเพิ่มดูวิธี HumanSoft ทำไว้ในบทสนทนาเดิม
11. **แก้บั๊ก: กล่องแผนที่เล็กๆ ตอนเช็คอินขึ้น "Access blocked" แทนรูปแผนที่** — สาเหตุคือ `tile.openstreetmap.org` (ที่ `mobile/src/utils/staticMap.ts` ใช้ทำรูปแผนที่ย่อ) เริ่มบล็อก request จากแอปที่แพ็กแล้ว (ส่งรูป tile ที่มีคำว่า "Access blocked" มาแทน) เพราะ OSM มี usage policy บล็อก bulk/generic mobile traffic — curl ทดสอบจากเครื่อง dev เฉยๆ ผ่านปกติ เลยกว่าจะเจอสาเหตุจริงต้องให้ผู้ใช้ report ก่อน เปลี่ยนไปใช้ CARTO free basemap tiles (`basemaps.cartocdn.com/light_all`) แทน ไม่ต้องใช้ API key เหมือนเดิม — ถ้าเจอปัญหาแผนที่บล็อกอีกในอนาคต ให้สงสัย tile provider เป็นอันดับแรก
12. **"ขาด" (absenceCount) กดดูรายวันที่ขาดได้** — เพิ่ม `absenceDatesInRange` ใน `payroll.ts` (คืน `string[]` ของวันที่ขาด, `countAbsencesInRange` ตอนนี้เป็นแค่ `.length` ของอันนี้แทนที่จะมี logic ซ้ำ) `PayrollBreakdown` มีฟิลด์ `absenceDates` เพิ่ม — มือถือมี component ใหม่ `DateListModal` (bottom-sheet แสดงลิสต์วันที่ + วันในสัปดาห์) ใช้ที่ 3 หน้า: หน้าตอกบัตร (StatCard "ขาด"), หน้าเงินเดือนพนักงาน (MyPayrollScreen), หน้าเงินเดือนแอดมิน (AdminPayrollScreen — กดที่ Tag "ขาด" ของพนักงานแต่ละคน) กดได้เฉพาะตอน `absenceCount > 0`
13. **กู้รหัสผ่านแอดมิน + ระบบ backup database** — รายละเอียดเต็มและ**ขั้นตอนที่ต้องไปตั้งค่าเองใน Resend/Railway/UptimeRobot** อยู่ที่หัวข้อ 9 ด้านล่าง (สำคัญ — ฟีเจอร์เหล่านี้ยังใช้งานไม่ได้เต็มที่จนกว่าจะตั้งค่าเสร็จ)

Unit test ของ payroll engine: **79 ข้อ ผ่านหมด** (`backend/src/lib/payroll.test.ts`) — เป็นจุดที่ business logic ซับซ้อนที่สุดของระบบ ถ้าจะแก้อะไรเกี่ยวกับเงินเดือนอีก ให้รันเทสต์นี้ก่อน/หลังเสมอ

## 6. แอปเดิม (บขส. บาร์) — อย่าไปยุ่ง

- อยู่ที่ `/Users/ton/Downloads/App บขส` (คนละโฟลเดอร์, คนละ git repo, คนละทุกอย่าง)
- Backend เดิมรันอยู่ที่เครื่อง Ton เองด้วย บนพอร์ต **4000 และ 4001** (dev + build อีกตัว) — ถ้าเปิด terminal มาเจอ process เหล่านี้ **อย่า kill เด็ดขาด**
- Deploy จริงอยู่ Railway บัญชี `busstationbar@gmail.com` (โปรเจกต์ `bxs-bar-backend`)
- EAS project `@bks-bar/punch-card-mobile`, มี Android APK ใช้งานจริง, iOS รอ Apple review
- มี HANDOFF.md ของตัวเองแยกต่างหากที่ `/Users/ton/Downloads/App บขส/HANDOFF.md`

## 7. สิ่งที่ยังไม่ได้ทำ / ทำต่อได้

- **ยังไม่มีระบบเก็บเงิน/subscription** — คุยแนวทางไว้แล้ว (ดูรายละเอียดในบทสนทนาเดิมถ้าต้องการ): แนะนำ Omise/Opn Payments (รองรับ PromptPay, เหมาะ SME ไทย), ทำหน้า billing แยกเป็นเว็บ (ไม่ใช้ In-App Purchase เพราะโดนหัก 15-30%), เพิ่ม `Organization.plan/subscriptionStatus`
- **APK ล่าสุดที่ build ไว้เก่ากว่าโค้ดปัจจุบันมาก** — ต้อง `eas build --profile preview --platform android` ใหม่ก่อนให้ผู้ใช้ทดสอบบนมือถือจริง (คำสั่งรันจาก `mobile/` ผ่าน `npx eas-cli build --profile preview --platform android --non-interactive`)
- ยังไม่มีการทดสอบ iOS (ยังไม่เคย build iOS เลยรอบนี้)
- Simulator preview บน Mac เครื่องนี้ค่อนข้าง flaky (simulator shutdown เองบ่อย) — ถ้าจะ demo ผ่าน simulator อีก อาจต้องสร้าง device ใหม่หรือใช้ APK บนมือถือจริงแทนจะเสถียรกว่า

## 8. Environment / ค่าที่ควรรู้

- `backend/.env` (local, ไม่ commit) มี `DATABASE_URL` ชี้ placeholder local, `JWT_SECRET` สุ่มไว้แล้ว, R2 vars ว่างไว้ (ใช้ local disk fallback ตอน dev)
- `mobile/.env` ชี้ไปที่ backend Railway จริงแล้ว (`EXPO_PUBLIC_API_URL=https://teampunch-production.up.railway.app`) — เวลา dev ผ่าน Expo Go จะยิงไป production backend ตรงๆ (ระวังเวลาทดสอบ อาจสร้างข้อมูลทดสอบปนกับของจริงถ้ามีผู้ใช้จริงแล้ว)
- ทุกครั้งที่แก้ Prisma schema ต้อง generate migration แบบ offline (ไม่มี DB connection ตรงจากเครื่องนี้ไป production ได้โดยตรง) ด้วยวิธีนี้:
  ```bash
  cd backend
  git show HEAD:backend/prisma/schema.prisma > /tmp/prev_schema.prisma
  mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_ชื่อ_migration"
  DIR=$(ls -d prisma/migrations/2*_ชื่อ_migration)
  npx prisma migrate diff --from-schema-datamodel /tmp/prev_schema.prisma --to-schema-datamodel prisma/schema.prisma --script > "$DIR/migration.sql"
  npx prisma generate
  ```
  Railway จะรัน `prisma migrate deploy` เองตอน deploy (อยู่ใน `npm run start` script)

## 9. ความปลอดภัย/reliability (กู้รหัสผ่าน, backup, แจ้งเตือนระบบล่ม) — ต้องตั้งค่าเองก่อนใช้งานได้จริง

โค้ดทำเสร็จหมดแล้ว แต่ 3 เรื่องนี้ต้องมีบัญชี/ตั้งค่าที่ Claude สร้างให้ไม่ได้ (นโยบายความปลอดภัย — สร้างบัญชีให้ผู้ใช้ไม่ได้) Ton ต้องทำเองตามขั้นตอนนี้:

### 9.1 กู้รหัสผ่านแอดมิน (ทำงานแล้ว แต่ต้องมี Resend API key ถึงจะส่งอีเมลได้จริง)

- Schema: `Admin.email` (nullable), `Admin.resetCodeHash` + `resetCodeExpiresAt` (รหัส 6 หลัก, hash ด้วย sha256, อายุ 15 นาที) — migration `add_admin_password_reset`
- Flow: หน้า login แอดมิน → "ลืมรหัสผ่าน?" → กรอก slug+username → ถ้า admin คนนั้นมี email ผูกไว้ ระบบส่งรหัส 6 หลักไปทางอีเมล (endpoint ตอบข้อความเดียวกันเสมอไม่ว่าจะเจอ username หรือไม่ กัน user enumeration) → กรอกรหัส + ตั้งรหัสผ่านใหม่
- แอดมินต้องตั้งอีเมลของตัวเองก่อนที่ **ตั้งค่า → อีเมลกู้คืนรหัสผ่าน** ถึงจะกู้รหัสผ่านได้ (ไม่มีอีเมลผูกไว้ = กู้ไม่ได้ ต้องแก้ใน database ตรงๆ เหมือนเดิม)
- **ต้องทำ**: สมัคร https://resend.com (free tier 3,000 อีเมล/เดือน) → เอา API key มาใส่ Railway env var `RESEND_API_KEY` → ถ้ายังไม่ verify custom domain, ใช้ `RESEND_FROM_EMAIL` default (`TeamPunch <onboarding@resend.dev>`) ได้เลย **แต่ sandbox แบบนี้ส่งได้เฉพาะไปที่อีเมลที่สมัคร Resend account เท่านั้น** — พอพร้อมเปิดใช้จริงกับแอดมินหลายคน/หลาย org ต้อง verify domain ของตัวเองใน Resend ก่อน แล้วเปลี่ยน `RESEND_FROM_EMAIL` เป็นโดเมนนั้น

### 9.2 Backup database ทุกคืน (โค้ดพร้อมแล้ว ต้องสร้าง Railway Cron Job เอง)

- Script: `backend/src/scripts/backupDatabase.ts` → `pg_dump --format=custom` แล้วอัปโหลดขึ้น R2 bucket เดิม (ที่ใช้เก็บรูป) ใต้ prefix `backups/` เก็บย้อนหลัง 14 ชุด (ลบของเก่าอัตโนมัติ)
- เพิ่ม `backend/nixpacks.toml` ติดตั้ง `postgresql-client` (pg_dump) เข้า build image
- npm script: `npm run backup` (รัน `dist/src/scripts/backupDatabase.js`)
- **ต้องทำใน Railway dashboard**:
  1. เปิดโปรเจกต์ `resilient-benevolence` → "+ New" → "GitHub Repo" → เลือก repo เดิม (`reventon7171/teampunch`)
  2. ตั้งชื่อ service เช่น `teampunch-backup`, Root Directory = `backend`
  3. ไปที่ Settings ของ service ใหม่นี้ → **Deploy → Custom Start Command** ใส่ `npm run backup` (อย่าใช้ `npm start` เพราะจะรัน `prisma migrate deploy` + เปิด server ทับซ้อนกับตัวหลัก)
  4. Settings → **Cron Schedule** ตั้งเป็น `0 20 * * *` (20:00 UTC = ตี 3 เวลาไทย ทุกคืน)
  5. Copy env vars จาก service หลักมาใส่ service นี้ด้วย (อย่างน้อย `DATABASE_URL`, `JWT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) — หรือใช้ Railway "Shared Variables" ถ้าอยากผูกอัตโนมัติ
  6. กด Deploy แล้วลอง "Run now" ดูสักครั้งว่าผ่าน — เช็คใน R2 bucket ว่ามีไฟล์ `backups/teampunch-....dump` ขึ้นมาจริง
- **กู้คืนข้อมูลตอนจำเป็น**: โหลดไฟล์ `.dump` จาก R2 มาเครื่อง แล้ว `pg_restore --clean --no-owner -d "$DATABASE_URL" ไฟล์.dump`

### 9.3 แจ้งเตือนถ้า backend ล่ม ทาง email (ยังไม่ได้ตั้งค่า — ต้องทำเองทั้งหมด ไม่มีโค้ดเกี่ยวข้อง)

backend ที่ล่มอยู่ ส่งอีเมลแจ้งตัวเองไม่ได้ ต้องใช้บริการภายนอกคอย ping แทน:

1. สมัคร https://uptimerobot.com (free tier พอสำหรับใช้งานนี้)
2. สร้าง Monitor ใหม่ → Monitor Type: **HTTP(s)** → URL: `https://teampunch-production.up.railway.app/health` → Monitoring Interval: 5 นาที
3. ตั้ง Alert Contact เป็นอีเมลที่ต้องการรับแจ้งเตือน (`wuttiwat.pint@gmail.com`)
4. เสร็จแล้ว — ถ้า `/health` ตอบไม่ได้ 2 รอบติดกัน (~10 นาที) จะมีอีเมลแจ้งทันที และแจ้งอีกทีตอนกลับมาใช้ได้ปกติ

### 9.4 ตรวจสอบความปลอดภัยเพิ่มเติม (สรุปจากการรีวิวโค้ด)

**ที่ดีอยู่แล้ว**: bcrypt 12 rounds, JWT เก็บใน SecureStore (มือถือ), helmet+CORS, rate limit หน้า login/register/forgot-password, multer จำกัดชนิด/ขนาดไฟล์รูป, รูปเช็คอิน proxy ผ่าน backend ไม่ใช่ public URL, `.env` ไม่เคย commit, `npm audit` = 0 vulnerabilities, ทุก query scope ด้วย organizationId ถูกต้อง

**ยังไม่ได้ทำ (ทำต่อได้ถ้าต้องการ)**:
- Rate limit มีแค่หน้า auth — endpoint อื่น (check-in, สร้างพนักงาน ฯลฯ) ยังไม่มี ความเสี่ยงต่ำเพราะต้อง login ก่อนแต่ควรมีกันสแปม/DoS เบาๆ
- ไม่มี audit log — ถ้าแอดมินลบ/แก้ข้อมูลผิด ไม่มีประวัติว่าใครทำอะไรเมื่อไหร่
- Resend sandbox (`onboarding@resend.dev`) จำกัดส่งได้แค่อีเมลเดียว (ดูหัวข้อ 9.1) — ต้อง verify domain ก่อนเปิดให้แอดมินหลายคนใช้กู้รหัสผ่านจริง
- ยังไม่มี 2FA สำหรับแอดมิน (โอเคสำหรับสเกลตอนนี้)

---

**บอก Claude ในเซสชันใหม่ประมาณนี้ได้เลย**: "อ่านไฟล์ `/Users/ton/Downloads/TeamPunch/HANDOFF.md` ก่อน แล้วช่วย [สิ่งที่อยากทำต่อ] ให้หน่อย"
