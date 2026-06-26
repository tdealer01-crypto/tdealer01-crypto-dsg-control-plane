# DSG ONE คู่มือเริ่มต้นอย่างรวดเร็ว — 5 นาทีจนถึงการกำกับดูแล AI

ยินดีต้อนรับสู่ **DSG ONE / ProofGate** แพลตฟอร์มควบคุมและกำกับดูแล runtime ของ AI คู่มือนี้จะพาคุณจากสถานะเริ่มต้นไปถึงตัวแทน AI ที่ใช้งานได้จริงและถูกควบคุมภายใน 5 นาที

## สิ่งที่คุณจะได้

- ✓ อินสแตนซ์ระบบควบคุมทำงานเรียบร้อยในเครื่องหรือบน Vercel
- ✓ API key แรกสำหรับการตรวจสอบสิทธิ
- ✓ การบันทึกการตัดสินใจแบบเรียลไทม์และข้อมูลการตรวจสอบ
- ✓ แดชบอร์ดแสดงการกระทำที่ถูกควบคุมทั้งหมด

---

## ขั้นตอนที่ 1: โคลนและติดตั้ง (2 นาที)

### ตัวเลือก A: GitHub CLI (เร็วที่สุด)

```bash
gh repo clone tdealer01-crypto-dsg-control-plane dsg-one
cd dsg-one
npm ci
```

### ตัวเลือก B: Git

```bash
git clone https://github.com/tdealer01-crypto-dsg-control-plane dsg-one
cd dsg-one
npm ci
```

### npm ci ทำการติดตั้ง

- ติดตั้งเวอร์ชันที่ชัดเจนจาก `package-lock.json`
- ข้ามการเรียก postinstall ที่อาจล้มเหลวใน CI
- ล็อคการขึ้นต่อกันเพื่อความสามารถในการทำซ้ำ

---

## ขั้นตอนที่ 2: การตั้งค่าสภาพแวดล้อม (1 นาที)

### คัดลอกไฟล์ env ตัวอย่าง

```bash
cp .env.example .env.local
```

### เติมตัวแปรที่จำเป็น

**ต่ำสุดเพื่อรันในเครื่อง:**

```bash
# ตัวตนแอป
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Supabase (รับจาก https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ไม่บังคับ: Anthropic (สำหรับ Hermes AI runtime)
ANTHROPIC_API_KEY=sk-ant-...
```

**เพื่อใช้ไฟล์กำหนดค่าการพัฒนา:**

```bash
export DSG_CONFIG_PATH=./config/default.json
# หรือ
export DSG_CONFIG_PATH=./config/default.yaml
```

---

## ขั้นตอนที่ 3: เรียกใช้ระบบควบคุม (1 นาที)

### เริ่มเซิร์ฟเวอร์การพัฒนา

```bash
npm run dev
```

คุณควรเห็น:

```
Ready in 2.3s

Local:  http://localhost:3000
```

### เปิดเบราว์เซอร์ของคุณ

นำทางไปยัง `http://localhost:3000` และคุณจะเห็น **แดชบอร์ดระบบควบคุม**

---

## ขั้นตอนที่ 4: สร้าง API Key แรกของคุณ (1 นาที)

1. เข้าสู่ระบบที่ `http://localhost:3000/auth/signin` (ใช้ Supabase auth)
2. ไปที่ **แดชบอร์ด** → **API Keys**
3. คลิก **สร้าง API Key**
4. บันทึก key ไว้อย่างปลอดภัย — จะไม่แสดงอีกครั้ง

ตัวอย่างการตอบสนอง:

```json
{
  "id": "key_abc123",
  "key": "YOUR_API_KEY_HERE",
  "org_id": "org_123",
  "created_at": "2024-06-26T..."
}
```

---

## ขั้นตอนที่ 5: ทำการร้องขอแบบควบคุมครั้งแรก (ไม่บังคับ แต่ขอแนะนำ)

### ทดสอบ endpoint การดำเนินการ

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action": "transfer_funds",
    "amount": 100,
    "recipient": "wallet_xyz"
  }'
```

**การตอบสนอง (ตัวอย่าง):**

```json
{
  "decision": "ALLOW",
  "reason": "Within daily limit",
  "execution_id": "exec_123",
  "latency_ms": 45
}
```

---

## ขั้นตอนที่ 6: ดูแดชบอร์ดของคุณ

1. ไปที่ **http://localhost:3000/dashboard**
2. คุณจะเห็น:
   - จำนวนตัวแทนที่ใช้งาน
   - การดำเนินการที่เพิ่งเสร็จสิ้น (การตัดสินใจ ALLOW/BLOCK/STABILIZE)
   - สถานะระบบ (สุขภาพของ Core DB)
   - ความคืบหน้าการตั้งค่า

---

## ขั้นตอนถัดไป

| งาน | ลิงก์ | เวลา |
|------|------|------|
| ตั้งค่า Hermes AI | `/dashboard/hermes` | 2 นาที |
| ตั้งค่านโยบาย | `/dashboard/policies` | 3 นาที |
| เปิดใช้งานการเรียกเก็บเงิน | `/dashboard/billing` | 2 นาที |
| ดูบันทึกการตรวจสอบ | `/dashboard/audit` | 1 นาที |

---

## ปัญหาทั่วไป

### "การเชื่อมต่อ Supabase ล้มเหลว"

- [ ] ตรวจสอบว่า `.env.local` มี `NEXT_PUBLIC_SUPABASE_URL`
- [ ] ยืนยันว่า URL ถูกต้อง (จากแดชบอร์ด Supabase)
- [ ] ยืนยันว่าโครงการ Supabase ทำงานอยู่

### "Auth ไม่ทำงาน"

- [ ] ตรวจสอบให้แน่ใจว่า Supabase auth เปิดใช้งาน
- [ ] ตรวจสอบว่า ANON_KEY ไม่ว่าง

### "พอร์ต 3000 ถูกใช้แล้ว"

```bash
# ใช้พอร์ตอื่น
npm run dev -- -p 3001
```

---

## รูปแบบการกำหนดค่า

คุณสามารถระบุการกำหนดค่าในสามรูปแบบ ระบบควบคุมจะโหลดตามลำดับนี้:

1. **ตัวแปรสภาพแวดล้อม** (ความสำคัญสูงสุด)
2. **JSON** (`config/default.json`)
3. **YAML** (`config/default.yaml`)

ตัวอย่างกับ JSON:

```bash
export DSG_CONFIG_FORMAT=json
npm run dev
```

ตัวอย่างกับ YAML:

```bash
export DSG_CONFIG_FORMAT=yaml
npm run dev
```

---

## การปรับใช้ในสภาพแวดล้อมการผลิต

### ปรับใช้ไป Vercel

```bash
npm run deploy:prod
```

### ตัวแปรสภาพแวดล้อมที่จำเป็นในการผลิต

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### ตรวจสอบสุขภาพการปรับใช้

```bash
npm run go:no-go https://your-production-url.vercel.app
```

---

## ขั้นตอนถัดไป

- อ่านอ้างอิง API เต็ม **[API Reference](/docs/API_REFERENCE.md)**
- สำรวจ **[นโยบายการกำกับดูแล](/docs/governance-policies.md)**
- เข้าร่วมชุมชนบน Discord
- อีเมล: `support@dsg.pics`

ขอให้โชคดีในการกำกับดูแล! 🛡️
