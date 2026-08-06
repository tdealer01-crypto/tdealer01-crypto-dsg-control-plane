# Marketplace Get Started Acceptance Checklist

Date: 2026-04-11
Purpose: ใช้ตรวจสอบว่า onboarding flow สำหรับผู้ใช้ใหม่ “เริ่มได้จริง” ก่อนปล่อย marketplace

## A) First-time user setup

- [ ] สมัคร/ล็อกอินสำเร็จ
- [ ] สร้าง organization สำเร็จ
- [ ] เชิญสมาชิกและรับเชิญสำเร็จ
- [ ] กำหนด role แล้วสิทธิ์ถูกต้องตาม RBAC

## B) First workflow value

- [ ] สร้าง/รับ work item ได้
- [ ] submit action สำเร็จและบันทึก DB จริง
- [ ] approve/reject/escalate ทำงานจริงตามสิทธิ์
- [ ] dashboard สะท้อนสถานะล่าสุดตรงกับ DB

## C) Audit + trust

- [ ] action สำคัญมี audit trail ครบ
- [ ] query audit แล้วเห็น actor/time/action ชัด
- [ ] cross-org data access ถูกปิด (isolation ผ่าน)

## D) Entitlement + billing

- [ ] entitlement gate ทำงานจริงตาม plan/seat/quota
- [ ] quota exceeded ให้ error message ชัดเจน
- [ ] upgrade path ใช้งานได้จริง

## E) Operability

- [ ] health endpoint ผ่าน
- [ ] error state สำคัญมี remediation message
- [ ] runbook incident/recovery ใช้งานได้จริง

## F) Marketplace submission gate

- [ ] Terms / Privacy / Security / Support pages พร้อม
- [ ] demo script ใช้ production flow เดียวกับลูกค้าจริง
- [ ] smoke test บัญชีใหม่ผ่านครบทุกข้อ A-E

## Result

- [ ] **GO** (ผ่านครบ)
- [ ] **NO-GO** (มีข้อไม่ผ่าน)
