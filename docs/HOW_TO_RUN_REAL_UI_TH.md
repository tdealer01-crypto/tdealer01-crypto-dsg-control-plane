# วิธีทำให้แอปทำงานจริง “แบบในรูป” (DSG ONE) [TH]

เอกสารนี้สรุปแบบปฏิบัติจริงว่าต้องทำอะไรบ้างเพื่อให้หน้า Dashboard/Live Control/Command Center แสดงผลเป็นระบบจริง ไม่ใช่ภาพ mock.

## 1) เข้าใจจุดสำคัญก่อน

ถ้าเห็นจอ “ดำ/ว่าง” ด้านบนแล้วค่อยมี UI ด้านล่าง (แบบในรูปตัวอย่าง) มักเกิดจาก 3 กลุ่มปัญหา:
1. เปิด URL ที่เป็นรูปภาพจาก CDN (`cloudfront`, `amazonaws`) ไม่ใช่ URL ของแอป Next.js
2. แอปโหลดได้ แต่ API หลังบ้านยังไม่พร้อม (health/usage/executions/audit)
3. ยังไม่ได้ตั้งค่า environment + database migration ครบ

> ดังนั้น ต้องใช้ URL ของแอปจริง (เช่น Vercel domain ของโปรเจ็กต์) และให้ backend dependencies พร้อมก่อน

## 2) URL ที่ควรเปิด (ของแอปจริง)

เมื่อ deploy แล้ว ให้เข้าเส้นทางเหล่านี้โดยตรง:

- `/dashboard`
- `/dashboard/live-control`
- `/dashboard/command-center`
- `/dashboard/executions`
- `/dashboard/verification`

หน้า `live-control` จะดึงข้อมูลจาก API จริงของระบบ:
- `/api/health`
- `/api/usage`
- `/api/executions?limit=8`
- `/api/integration`
- `/api/audit?limit=8`

ถ้า endpoint ใดล้ม หน้า UI ยังขึ้นได้ แต่จะมี warning/error บนหน้าแทนข้อมูลจริง.

## 2.5) ทางลัด: ใช้สคริปต์ตรวจความพร้อมอัตโนมัติ

รันคำสั่งเดียวเพื่อตรวจ env + endpoint หลัก:

```bash
npm run ops:live-ui-check
```

ถ้าต้องการเช็กเฉพาะตัวแปรแวดล้อม (ยังไม่เปิดเซิร์ฟเวอร์):

```bash
./scripts/live-ui-readiness-check.sh --env-only
```

## 3) เช็กระบบขั้นต่ำ (ต้องผ่านก่อน)

### 3.1 ติดตั้งและรันในเครื่อง
```bash
npm ci
npm run dev
```

### 3.2 เช็ก health
```bash
curl -sS http://localhost:3000/api/health
```
คาดหวังว่าควรเห็น `ok: true` และ ideally `core_ok: true`, `db_ok: true`.

### 3.3 เช็ก endpoint ที่หน้า live-control ใช้
```bash
curl -sS http://localhost:3000/api/usage
curl -sS "http://localhost:3000/api/executions?limit=8"
curl -sS http://localhost:3000/api/integration
curl -sS "http://localhost:3000/api/audit?limit=8"
```

ถ้า endpoint เหล่านี้ยังไม่ผ่าน ให้แก้ env + DB + core connectivity ก่อน (ข้อ 4).

## 4) Environment ที่ต้องตั้งให้ครบ

อิง `.env.example` และ runbook deploy:

- Supabase
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- App origin
  - `APP_URL` หรือ `NEXT_PUBLIC_APP_URL`
- DSG Core
  - `DSG_CORE_MODE` (`internal` หรือ `remote`)
  - `DSG_CORE_URL` (เมื่อใช้ `remote`)
  - `DSG_CORE_API_KEY` (เมื่อใช้ `remote`)
- Billing/Access (ตาม flow ที่ใช้)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`
  - `OVERAGE_RATE_USD`
  - `ACCESS_MODE`, `ACCESS_POLICY`

## 5) Database/Migration ต้องครบ

ระบบ runtime/pipeline จะไม่ขึ้นครบถ้า Supabase migration ไม่ครบ โดยเฉพาะชุด runtime spine + rpc hardening.

แนวทางคือ apply migrations ทั้งชุดใน `supabase/migrations/*` ตามลำดับ แล้วตรวจ smoke test API อีกครั้ง.

## 6) วิธีให้ “เหมือนในรูป” มากขึ้น (เชิง UX)

- ใช้ route กลุ่ม cyber UI โดยตรง (`/dashboard/live-control`, `/dashboard/command-center`, `/dashboard/verification`)
- เปิดผ่านโดเมนจริงของแอป ไม่ใช่ลิงก์รูป CDN
- ทดสอบบนมือถือผ่าน browser ปกติ (Chrome/Safari) หลัง deploy
- หากต้องการเต็มจอ ให้ปิดแถบ browser UI หรือใช้ “Add to Home Screen”

## 7) นิยามคำว่า “ทำงานจริง” สำหรับโปรเจ็กต์นี้

อย่างน้อยต้องผ่านพร้อมกัน:
1. หน้า dashboard กลุ่มหลักเปิดได้
2. `/api/health` ผ่าน (`ok/core_ok/db_ok`)
3. live-control ดึง usage/executions/integration/audit ได้
4. login + org scope ผ่าน
5. execution จริงผ่าน `POST /api/execute` และมี record ใน execution/audit

ถ้าผ่านทั้ง 5 ข้อนี้ ถือว่าไม่ใช่ demo image แล้ว แต่เป็น control plane ที่วิ่งกับ runtime จริง.
