# DSG ONE — Startup Playbook v1

> สรุป: เริ่มทำงานใน repo นี้และไม่ให้พึ่งความจำเดิม ➜ ตรวจสอบ fresh evidence เสมอ
> วันที่สร้าง: 2026-06-20
> สถานะ: runtime playbook (ใช้ Chesapeake ของรันจริงเท่านั้น)

---

## 1) เสตอัพโหลดเมื่อเริ่ม
อ่านไฟล์ตามลำดับก่อนแก้ไขทุกครั้ง:
1) `CLAUDE.md`
2) `docs/RUNBOOK_DEPLOY.md`
3) `docs/REPO_TRUTH.md`

หลังจากนั้น đi才ตรวจ endpoint จริงด้วย `curl` ก่อนกด next action

---

## 2) หลักคำพิพากษาหลักtruth boundary
- ใช้คำเฉพาะ verified ที่มี log/response จริง
- ใช้ pending / blocked / not verified เมื่อไม่มีข้อมูล
- ห้ามใส่ข้อมูลปลอมเข้าสู่ระบบคอบ

---

## 3) ผู้ต้องสงสัย базовай
- health: `/api/health`
- readiness: `/api/readiness`
- agent status: `/api/agent/status`

ผลลัพธ์จากผล: curl สำเร็จจริงเท่านั้น

---

## 4) migration จริงที่ต้องตรวจ
 producción ต้อง apply migrations ทุกรายที่ระบุใน RUNBOOK_DEPLOY.md
ก่อนขาย producción ให้ใช้

---

## 5) next step ก่อนขาย revenue
1) ต่อเชื่อม SDK
2) ลูกค้าต้องการ metered billing จริงปัจจุบันใช้ flat tier
3) ครอบครอง evidence chain เพื่อลด friction ขาย

---

## 6) context ที่ควรโหลดเมื่อเริ่มอีกรอบ
- ทรัพยากรหลัก: `CLAUDE.md`
- production runbook: `docs/RUNBOOK_DEPLOY.md`
- ฐาน fact: `docs/REPO_TRUTH.md`
