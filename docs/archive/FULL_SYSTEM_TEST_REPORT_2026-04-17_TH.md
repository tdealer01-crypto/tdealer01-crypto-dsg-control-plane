# Full System Test Report (Thai)

วันที่รันทดสอบ: 2026-04-17 (UTC)
ผู้รัน: Codex agent

## 1) Scope ที่รันจริง

รัน test suite ครบทุกหมวดที่มีใน repository ตาม script มาตรฐาน:

- Unit (`npm run test:unit`)
- Integration (`npm run test:integration`)
- Failure/Negative (`npm run test:failure`)
- Migrations (`npm run test:migrations`)
- E2E (`npm run test:e2e`)
- E2E browser install (`npm run test:e2e:install`)

---

## 2) ผลลัพธ์สรุป

| Category | Result | รายละเอียด |
|---|---|---|
| Unit | PASS | 29 files, 109 tests ผ่านทั้งหมด |
| Integration | PASS (with skips) | 28 files ผ่าน, 1 file skipped, 65 tests ผ่าน, 3 tests skipped |
| Failure (negative) | PASS | 1 file, 4 tests ผ่าน |
| Migrations | PASS | 4 files, 7 tests ผ่าน |
| E2E (Playwright) | FAIL (environment) | ไม่สามารถ launch browser ได้ เพราะไม่มี executable |
| E2E browser install | FAIL (environment) | ดาวน์โหลด Chromium ไม่สำเร็จ (HTTP 403: `Domain forbidden`) |

---

## 3) สรุปตามเกณฑ์ pass/fail ที่กำหนด

- ยัง **ไม่สามารถสรุป pass/fail เชิง full-flow UI จริงทั้งหมด** ได้ เนื่องจาก E2E browser ใน environment นี้ใช้งานไม่ได้
- Fail ของ E2E ที่พบเป็น **environment/tooling issue** ไม่ใช่ assertion fail ของ business logic

---

## 4) Error หลักที่พบ

### 4.1 Playwright runtime

- `browserType.launch: Executable doesn't exist`
- ชี้ว่าบนเครื่องยังไม่มี Chromium binary ตาม path ที่ Playwright คาดหวัง

### 4.2 Playwright install

- `Failed to download Chrome for Testing ...`
- ต้นเหตุหลัก: HTTP 403 และข้อความ `Domain forbidden` จาก `https://cdn.playwright.dev/...`

---

## 5) ข้อเสนอแนะเพื่อปิด full-system test ให้ครบ

1. ตั้งค่า browser mirror ภายในองค์กร หรือ allowlist `cdn.playwright.dev`
2. หรือใช้ prebuilt Docker image ที่ bundle browser มาแล้ว
3. ตั้ง `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ให้ชี้ binary ที่ใช้ได้จริง
4. หลังแก้ infra แล้ว re-run:
   - `npm run test:e2e:install`
   - `npm run test:e2e`
   - `npm run test:e2e:live` (ถ้าต้องการ live Supabase flow)

---

## 6) คำสรุป

- ฝั่ง unit/integration/failure/migration ของโค้ดผ่านตามที่รันในวันนี้
- จุดค้างหลักยังเป็น E2E browser provisioning (environment boundary) จึงยังไม่สามารถยืนยัน "เทสทั้งระบบแบบ browser flow ครบทุกหน้า" ได้จนกว่า infra จะพร้อม

