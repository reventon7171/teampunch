# TeamPunch

ระบบเช็คอินพนักงาน + คำนวณเงินเดือน สำหรับธุรกิจขนาดเล็ก — สมัครใช้งานได้ฟรี หลายกิจการใช้ระบบเดียวกันได้ (multi-tenant)

Fork มาจากระบบเช็คอินพนักงานเดิมของ บขส. บาร์ (single-tenant) แล้วเพิ่มระบบ Organization (หนึ่งบัญชีต่อหนึ่งกิจการ) เพื่อให้เปิดสมัครสาธารณะได้

```
backend/    Node.js + Express + TypeScript + Prisma + PostgreSQL — REST API
mobile/     Expo + React Native + TypeScript — แอพมือถือ (แอดมิน + พนักงาน)
```

## Setup เบื้องต้น

### Backend

```bash
cd backend
npm install
cp .env.example .env   # แล้วแก้ DATABASE_URL / JWT_SECRET เป็นของจริง
npx prisma migrate dev --name init   # ต้องมี Postgres จริง (local หรือ Neon) ก่อน
npm run seed            # สร้างองค์กร+แอดมินตัวอย่าง (ดู SEED_* ใน .env)
npm run dev
```

### Mobile

```bash
cd mobile
npm install
cp .env.example .env    # แก้ EXPO_PUBLIC_API_URL ให้ชี้ไปที่ backend
npm start
```

## Multi-tenancy

ทุกกิจการที่สมัครจะได้ `Organization` ของตัวเอง พร้อม **slug** (รหัสร้าน/บริษัท) ที่ใช้ตอน login เพราะ username ไม่ unique ข้ามกิจการ (แต่ unique ภายในกิจการเดียวกัน) — สมัครผ่าน `POST /api/auth/admin/register` หรือหน้าจอ "สมัครใช้งานฟรี" ในแอพ

## Photo storage (Cloudflare R2)

รูปถ่ายยืนยันตัวตนตอนเช็คอิน/เช็คเอาท์/แนบเอกสารลา เก็บผ่าน `backend/src/lib/storage.ts` — รองรับ Cloudflare R2 (S3-compatible) เป็นหลัก และ fallback เป็น local disk อัตโนมัติถ้ายังไม่ตั้งค่า R2 (สะดวกตอน dev แต่ **local disk ไม่ทนต่อการ redeploy** บน hosting ส่วนใหญ่ ข้อมูลรูปจะหายถ้าไม่ใช้ R2 ตอน production)

### สร้าง R2 bucket (ฟรี ไม่ต้องผูก email ส่วนตัว)

1. ไปที่ [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket → ตั้งชื่อ เช่น `teampunch-photos`
2. ไปที่ R2 → Manage API tokens → Create API token → เลือกสิทธิ์ "Object Read & Write" จำกัดเฉพาะ bucket นี้
3. คัดลอกค่าที่ได้ใส่ใน `.env` ของ backend:
   ```
   R2_ACCOUNT_ID="..."
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET_NAME="teampunch-photos"
   ```

รูปแต่ละกิจการถูกเก็บแยก prefix `org/{organizationId}/...` ในบัคเก็ตเดียวกัน กิจการหนึ่งเข้าถึงรูปของอีกกิจการไม่ได้ (คุมสิทธิ์ผ่าน API เดิม ไม่ได้เปิด bucket เป็น public)

## Testing

```bash
cd backend && npm test   # unit test payroll (pure logic, ไม่ต้องต่อ DB)
```
