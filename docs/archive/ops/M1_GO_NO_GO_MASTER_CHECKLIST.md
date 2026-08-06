# M1 Master GO / NO-GO Checklist (ขายจริง)

อัปเดต: 2026-04-12

เอกสารนี้คือ checklist เดียวสำหรับตัดสิน **GO / NO-GO** โดยผูกกับ workflow อัตโนมัติ:

- `.github/workflows/m1-go-no-go.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/production-readiness.yml`

---

## A) Runtime proof
- [x] `E2E Pipeline` ผ่านครบ `typecheck -> test -> test:e2e -> test:e2e:live`
- [x] `test:e2e` ผ่านใน pipeline ที่มี browser/runtime พร้อม
- [x] `test:e2e:live` ไม่ skip และผ่านจริงกับ Supabase
- [x] มีลิงก์หลักฐาน Actions run ใน PR/release

## B) Staging proof
- [x] มี staging URL จริง (`workflow_dispatch` input: `staging_url`)
- [x] `test:e2e:staging` ผ่านกับ staging URL
- [x] `scripts/go-no-go-gate.sh <staging_url>` ผ่าน (browser→app→API→DB baseline)
- [x] แนบหลักฐาน run ล่าสุด

## C) Core product correctness
- [x] ไม่มีการเรียก `/api/finance-governance/server-store/*` เหลือใน app/lib/tests  
  ยืนยันโดย test guard `tests/integration/api/finance-governance-callers.test.ts` และ grep เชิงโค้ดทั้ง repo ก่อน release
- [x] เส้นทาง critical ใช้ DB-backed flow จริง (ยืนยันผ่าน integration + e2e live)  
  อ้างอิง `tests/integration/api/finance-governance-live-db.test.ts` + `tests/e2e/finance-governance-live-supabase.spec.ts`
- [x] org isolation / audit / dashboard state ถูกต้อง (ยืนยันจาก test suite)  
  อ้างอิง `tests/integration/api/enterprise-proof-runtime-report.test.ts`, `tests/integration/api/spine-execute.test.ts`, `tests/integration/ui/finance-governance-live-workflow.test.ts`

## D) Environment / secrets
- [x] Supabase secrets ครบ (`SUPABASE_URL`, `SUPABASE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [x] Stripe secrets ครบ (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`)
- [x] Resend secret ครบ (`RESEND_API_KEY`)
- [x] ไม่มี shared/temp credential (ใช้ GitHub/Vercel/Supabase secret store เท่านั้น)
- [x] มีแผน rotate secret หลัง deploy:
  1. Rotate `SUPABASE_SERVICE_ROLE_KEY` และ update Vercel env
  2. Rotate `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
  3. Rotate `RESEND_API_KEY`
  4. บังคับ invalidate credential เก่า + rerun `production-readiness` workflow

## E) Governance / hardening
- [x] lockfile guard ทำงานใน CI
- [x] deterministic install (`npm ci`) บังคับใช้ใน workflow หลัก
- [x] error handling policy check (`scripts/check-error-handlers.sh`) ผ่าน
- [x] CORS policy ชัดเจน (ถ้ารองรับ external client)
- [x] production script governance ชัดเจนในเอกสาร

## F) Onboarding / get-started
- [x] signup/login แล้วเข้า flow แรกได้จริง
- [x] ไม่ต้อง manual DB fix
- [x] ไม่ต้องเปิด feature flag เฉพาะกิจ
- [x] demo script ใช้ flow เดียวกับ production

## G) Trust surface
- [x] `/terms` พร้อม
- [x] `/privacy` พร้อม
- [x] `/security` พร้อม
- [x] `/support` พร้อม
- [x] owner incident/support/release sign-off ชัดเจน

## H) Final release decision
- [x] มี release checklist เดียวที่รวม migration order, rollback plan, post-deploy verify (`docs/ops/GO_NO_GO.md`)
- [x] มี GO/NO-GO owner: **Release Manager (on-duty) = final decision owner**, โดยต้องมี sign-off จาก QA/Security/Ops/Product ครบก่อนอนุมัติ
- [x] ถ้าข้อ A/B/F/G ไม่ครบ = **NO-GO**
- [x] ครบทุกข้อเท่านั้น = **GO**

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
