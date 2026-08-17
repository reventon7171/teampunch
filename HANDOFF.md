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

Unit test ของ payroll engine: **76 ข้อ ผ่านหมด** (`backend/src/lib/payroll.test.ts`) — เป็นจุดที่ business logic ซับซ้อนที่สุดของระบบ ถ้าจะแก้อะไรเกี่ยวกับเงินเดือนอีก ให้รันเทสต์นี้ก่อน/หลังเสมอ

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

---

**บอก Claude ในเซสชันใหม่ประมาณนี้ได้เลย**: "อ่านไฟล์ `/Users/ton/Downloads/TeamPunch/HANDOFF.md` ก่อน แล้วช่วย [สิ่งที่อยากทำต่อ] ให้หน่อย"
