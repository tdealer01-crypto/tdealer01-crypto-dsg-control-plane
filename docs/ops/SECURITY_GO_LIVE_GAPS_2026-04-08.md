# DSG Control Plane: Security Go-Live Gaps (2026-04-08)

เอกสารนี้สรุปเฉพาะ "สิ่งที่ยังเหลือก่อนเปิดบริการ production เต็มรูปแบบ" โดยอ้างอิงจากการทบทวนโค้ดปัจจุบันในรีโป

## สถานะโดยรวม

- กลไกหลักด้าน security ที่สำคัญใช้งานได้แล้ว: security headers, RBAC, SSO mode, API key hashing, webhook signature verification
- สำหรับประเด็นที่เคยถูก flagged ว่าเสี่ยงปานกลางบางจุด ปัจจุบันโค้ดมีการ harden แล้ว (เช่น rate limit ใน auth continue และ execute route)

## สิ่งที่ "ควรปิดงาน" ก่อน go-live

### 1) ยืนยัน lockfile ใน CI ว่าไม่ drift

- รีโปมี `package-lock.json` แล้ว
- ควรเพิ่มขั้นตอน CI แบบ deterministic install (`npm ci`) และ fail เมื่อ lockfile ถูกแก้โดยไม่ตั้งใจ
- เหตุผล: ป้องกัน supply chain drift และทำให้ build reproducible

## 2) มาตรฐาน error response ให้เป็น generic ทุก endpoint

- ปัจจุบันมีตัวช่วย `handleApiError()` แล้ว
- แนะนำให้ enforce ว่า route ใหม่ทั้งหมดต้องใช้ helper กลาง และห้ามส่ง internal error detail ตรงถึง client
- เหตุผล: ลดความเสี่ยง information leakage เมื่อเกิดข้อผิดพลาดจาก DB/third-party

### 3) วางนโยบาย CORS แบบ explicit (ถ้าจะเปิด external client)

- ถ้า API ใช้แบบ same-origin เท่านั้น สถานะปัจจุบันถือว่าปลอดภัย
- แต่ถ้าจะให้ mobile app / partner / external dashboard เรียก API โดยตรง ควรกำหนด CORS allowlist ชัดเจน
- เหตุผล: ลดการขยายพื้นผิวโจมตีแบบไม่ตั้งใจเมื่อเริ่มเปิด integration ภายนอก

### 4) จัดการ shell helper scripts สำหรับ production governance

- มีสคริปต์ช่วยงาน deploy/env setup ในรีโป
- ควรกำหนด policy ว่า script ใด "อนุญาตใน production workflow" และ script ใดเป็นเพียง local/dev tooling
- เหตุผล: ป้องกันการรันสคริปต์ผิดตัวและลด operational risk

## สรุปพร้อมเปิดบริการ

ถ้าต้องการสถานะ "พร้อมเปิดบริการแบบ enterprise baseline" ให้ปิด 4 เรื่องด้านบน โดยลำดับแนะนำคือ:

1. CI lockfile guard
2. Error handling policy enforcement
3. Explicit CORS policy (เฉพาะกรณีมี external client)
4. Script governance

เมื่อปิดครบ จะเหลือความเสี่ยงในระดับ operational tuning มากกว่าช่องโหว่เชิงสถาปัตยกรรมหลัก
