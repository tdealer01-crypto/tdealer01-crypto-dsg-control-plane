# M1 Master GO / NO-GO Checklist (ขายจริง)

อัปเดต: 2026-04-11

เอกสารนี้คือ checklist เดียวสำหรับตัดสิน **GO / NO-GO** โดยผูกกับ workflow อัตโนมัติ:

- `.github/workflows/m1-go-no-go.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/production-readiness.yml`

---

## A) Runtime proof
- [ ] `E2E Pipeline` ผ่านครบ `typecheck -> test -> test:e2e -> test:e2e:live`
- [ ] `test:e2e` ผ่านโดยไม่ติด browser/runtime
- [ ] `test:e2e:live` ไม่ skip และผ่านจริงกับ Supabase
- [ ] มีลิงก์หลักฐาน Actions run ใน PR/release

## B) Staging proof
- [ ] มี staging URL จริง (`workflow_dispatch` input: `staging_url`)
- [ ] `test:e2e:staging` ผ่านกับ staging URL
- [ ] `scripts/go-no-go-gate.sh <staging_url>` ผ่าน (browser→app→API→DB baseline)
- [ ] แนบหลักฐาน run ล่าสุด

## C) Core product correctness
- [ ] ไม่มีการเรียก `/api/finance-governance/server-store/*` เหลือใน app/lib/tests
- [ ] เส้นทาง critical ใช้ DB-backed flow จริง (ยืนยันผ่าน integration + e2e live)
- [ ] org isolation / audit / dashboard state ถูกต้อง (ยืนยันจาก test suite)

## D) Environment / secrets
- [ ] Supabase secrets ครบ
- [ ] Stripe secrets ครบ
- [ ] Resend secret ครบ
- [ ] ไม่มี shared/temp credential
- [ ] มีแผน rotate secret หลัง deploy

## E) Governance / hardening
- [ ] lockfile guard ทำงานใน CI
- [ ] deterministic install (`npm ci`) บังคับใช้ใน workflow หลัก
- [ ] error handling policy check (`scripts/check-error-handlers.sh`) ผ่าน
- [ ] CORS policy ชัดเจน (ถ้ารองรับ external client)
- [ ] production script governance ชัดเจนในเอกสาร

## F) Onboarding / get-started
- [ ] signup/login แล้วเข้า flow แรกได้จริง
- [ ] ไม่ต้อง manual DB fix
- [ ] ไม่ต้องเปิด feature flag เฉพาะกิจ
- [ ] demo script ใช้ flow เดียวกับ production

## G) Trust surface
- [ ] `/terms` พร้อม
- [ ] `/privacy` พร้อม
- [ ] `/security` พร้อม
- [ ] `/support` พร้อม
- [ ] owner incident/support/release sign-off ชัดเจน

## H) Final release decision
- [ ] มี release checklist เดียวที่รวม migration order, rollback plan, post-deploy verify
- [ ] มี GO/NO-GO owner
- [ ] ถ้าข้อ A/B/F/G ไม่ครบ = **NO-GO**
- [ ] ครบทุกข้อเท่านั้น = **GO**

---

## คำสั่งใช้งาน

### รัน gate แบบเต็มใน GitHub Actions
1. ไปที่ workflow **M1 GO / NO-GO Gate**
2. กรอก `staging_url`
3. Run workflow
4. ใช้ผลจาก job `decision` เป็นคำตัดสินสุดท้าย

### รัน trust/runtime gate แบบ local
```bash
npm run go:no-go -- https://your-staging-url.example.com
```

> ถ้า command หรือ workflow ตัวใดตัวหนึ่ง fail ให้ถือว่า **NO-GO** จนกว่าจะแก้และ rerun ผ่านทั้งหมด
