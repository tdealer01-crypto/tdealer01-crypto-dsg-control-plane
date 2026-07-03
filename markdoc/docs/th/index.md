# DSG ONE — คู่มือการใช้งาน

> เวอร์ชัน: 2026.06.24 | ภาษา: ไทย

---

## 🚀 เริ่มต้นใช้งาน

DSG ONE เป็นแพลตฟอร์มควบคุม AI Agent สำหรับองค์กร ที่ทำให้คุณสามารถ:

- 🛡️ **ควบคุม AI Actions** — กำหนดนโยบายก่อนดำเนินการ
- 📋 **บันทึก Audit Trail** — ทุกการตัดสินใจถูกบันทึกแบบ immutable
- 🔒 **ป้องกันความเสี่ยง** — Safe DOM verification + Policy gate
- 📊 **ดูสถานะระบบ** — Real-time dashboard + observability

---

## 📖 คู่มือทีละขั้นตอน

### 1. เข้าสู่ระบบ

```
URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/login
```

เลือก 1 ใน 3 วิธี:
1. **รหัสผ่าน** — สำหรับผู้ใช้ที่มีบัญชีแล้ว
2. **ลิงก์กู้คืน** — สำหรับผู้ที่ลืมรหัสผ่าน
3. **SSO** — สำหรับองค์กรที่กำหนดให้ใช้ Single Sign-On

### 2. สร้าง Workspace ใหม่ (ทดลอง 14 วันฟรี)

คลิก **"เริ่มทดลองใช้ 14 วันฟรี"** → กรอกข้อมูล:
- ชื่อองค์กร
- ชื่อผู้ใช้
- อีเมล

### 3. ดูสถานะระบบ (Dashboard)

หลังเข้าสู่ระบบ คุณจะเห็น:
- **4 กล่องสถานะ** — Agents, Executions, Core Status, DB Status
- **Products** — ลิงก์ไปยังแต่ละโมดูล
- **Chat Widget** — ล่างขวา สำหรับถาม AI Agent

### 4. ใช้ AI Agent

คลิกที่ไอคอนแชทล่างขวา → พิมพ์คำถาม → AI จะตอบเป็นภาษาไทย

ตัวอย่างคำถาม:
- "ตรวจสอบความพร้อมของระบบ"
- "ดู agents ทั้งหมด"
- "แสดง audit logs ล่าสุด"

---

## 🔧 ฟีเจอร์หลัก

### Policy Engine
กำหนดกฎควบคุม AI actions:
- ALLOW — อนุญาต
- BLOCK — ปฏิเสธ
- REVIEW — ต้องตรวจสอบ

### Audit Trail
ทุก decision ถูกบันทึกพร้อม:
- Actor (ใครทำ)
- Decision (อนุญาต/ปฏิเสธ)
- Proof hash (หลักฐาน)
- Timestamp

### Incident Response
ระบบจัดการเหตุการณ์ฉุกเฉิน:
- P1-P4 severity levels
- Escalation workflow
- Breach notification

---

## 🌐 เส้นทาง API (Routes)

| Route | ความหมาย |
|-------|---------|
| `/api/health` | สถานะระบบ |
| `/api/agents` | รายชื่อ Agents |
| `/api/executions` | ประวัติการทำงาน |
| `/api/audit` | Audit logs |
| `/api/incidents` | Incident management |
| `/api/agent-chat-v2` | AI Chat |

---

## ❓ คำถามที่พบบ่อย

**Q: ลืมรหัสผ่านทำไม?**
A: คลิก "ขอลิงก์กู้คืน" บนหน้า login → กรอกอีเมล → ระบบจะส่งลิงก์ให้

**Q: จะใช้ SSO ได้ไหม?**
A: ได้ คลิก "เข้าสู่ระบบผ่าน SSO" บนหน้า login

**Q: ข้อมูลปลอดภัยไหม?**
A: ใช้ AES-256 encryption, TLS 1.3, RBAC, และ ISO-42001 compliant

---

## 📞 ติดต่อสนับสนุน

- อีเมล: support@dsg-controlplane.com
- เอกสาร API: `/api/docs`

---

*อัปเดตล่าสุด: 2026-06-24*
