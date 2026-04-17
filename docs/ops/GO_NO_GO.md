# GO / NO-GO Release Checklist
**Repository:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`  
**Purpose:** เป็น checklist แบบชัดเจนสำหรับการตัดสินใจเปิดบริการ (full production). เอกสารนี้รวมทั้งเกตด้านเทคนิคและนโยบายความปลอดภัย พร้อมช่องให้ทีม sign-off.

---

## วิธีใช้ (Quick)
1. ใส่รายการนี้ใน PR description หรือแนบลิงก์ไปยังไฟล์นี้ใน PR/Release ticket.  
2. ทีมที่รับผิดชอบแต่ละหัวข้อให้แนบ *หลักฐาน* (CI link / curl output / screenshot / log) ในช่อง Evidence.  
3. เมื่อตรวจและยอมรับ ให้กรอกชื่อ/handle และเซ็นในตาราง Sign-off ด้านล่าง (หรือใช้ GitHub approval + comment ที่มีชื่อและวันที่).  
4. เมื่อทุกเกตถูก “✅” และ signature ครบ → ถือว่า **Go**.

---

## Summary: Go / No-Go Gates (สั้น)
- CI Security checks ✅  
- E2E / Playwright checks ✅  
- Vercel env / secrets ✅  
- Supabase migrations & DB backups ✅  
- DSG Core readiness ✅  
- Smoke checks & Quickstart flow ✅  
- Monitoring / Alerts / On-call ✅  
- Rollback plan tested ✅  
- Security Go-Live gaps closed ✅

รายละเอียดแต่ละข้อดูด้านล่าง

---

## Detailed Gates (ต้องผ่านทั้งหมดก่อน Go)

> **หมายเหตุ:** ให้แนบหลักฐาน (links / command outputs / logs) ในคอลัมน์ *Evidence* ของ PR

### 1) CI: Security Checks
- **What:** `ci-security` job must pass: lockfile guard, shellcheck, gitleaks, `npm audit` (no high/critical), `check-error-handlers.sh`.
- **Expected evidence:**
  - Link to GitHub Actions run for `ci-security` (green)  
  - If `gitleaks` ran → attach `gitleaks-report.json` (or link)  
  - `check-error-handlers.sh` output: `OK: all API routes...`
- **Command / example:**
  ```bash
  # Check in Actions; locally:
  bash -n scripts/check-error-handlers.sh
  ```
- **Pass when:** All steps exit 0 and no high/critical audit findings.

### 2) CI: E2E (Playwright)

- **What:** `e2e-playwright-docker` job must pass (Playwright run inside prebuilt Docker image).
- **Expected evidence:**

  - Link to Actions run `e2e` (green) with no failing specs.
  - If any failure: screenshots, trace files, failing test names.
- **Pass when:** All E2E specs pass in CI/staging.

(ปัญหา 403 CDN ที่เคยเกิดจะถูกข้ามเมื่อรันใน Docker image ที่มี browser prebuilt — ดู log ตัวอย่างใน repo)
อ้างอิง: Playwright install log (ตัวอย่าง CDN 403) 

### 3) Vercel env & Secrets

- **What:** Production env vars set and validated (see RUNBOOK for required list).
- **Required envs:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`/`NEXT_PUBLIC_APP_URL`, `DSG_CORE_MODE` (+ `DSG_CORE_URL`/`DSG_CORE_API_KEY` if `remote`), Stripe keys, etc. (เต็มรายการใน `docs/RUNBOOK_DEPLOY.md`). 
- **Expected evidence:** `npx vercel env ls production` output / screenshot.
- **Pass when:** All required keys are present and correct.

### 4) Supabase migrations & DB readiness

- **What:** Backed up DB then applied migrations in order.
- **Expected evidence:**

  - DB backup file metadata (pg_dump output)
  - `supabase db push` output (success)
  - Migration tests (if present) OK (e.g., `tests/migrations/*`)
- **Pass when:** Migrations applied successfully and smoke checks against schema succeed.

### 5) DSG Core readiness

- **What:** Control Plane can reach DSG Core and `api/core/monitor` returns `readiness_status: "ready"`.
- **Expected evidence:**

  - `curl -sS "$CONTROL_PLANE_URL/api/core/monitor" | jq .` output
- **Pass when:** HTTP 200 and `readiness_status: "ready"` in response. 

### 6) Smoke checks and sample execution

- **What:** `/api/health`, `/api/usage`, and a sample `/api/intent` → `/api/execute` path work.
- **Expected evidence:** curl outputs, example execution response with expected structure.
- **Command:**

  ```bash
  curl -sS https://<APP_URL>/api/health
  curl -sS https://<APP_URL>/api/core/monitor | jq .
  curl -sS -X POST https://<APP_URL>/api/intent -H 'Content-Type: application/json' -d '{"intent":"sample"}'
  ```
- **Pass when:** No 500 errors; sample execution returns expected decision data.

### 7) Quickstart / Auth flows

- **What:** Signup -> magic-link -> /dashboard/skills -> run Auto-Setup -> verify first execution -> land on /dashboard/executions -> inspect enterprise-proof & verified runtime.
- **Expected evidence:** Screenshots / session trace / Playwright E2E logs showing flow success. 

### 8) Monitoring & Alerts

- **What:** Uptime, error rate, latency and billing alerts configured and tested.
- **Expected evidence:** Monitoring dashboard screenshots, alert rules, and a test alert triggered & handled.
- **Pass when:** Alerts configured and on-call owner assigned.

### 9) Rollback plan & dry-run

- **What:** Rollback tested briefly: ability to redeploy previous commit OR restore DB from backup documented and validated.
- **Expected evidence:** Command history / logs of a dry-run rollback, rollback owner assigned.
- **Pass when:** Ops can restore previous state within defined SLA.

### 10) Security Go-Live gaps closed

- **What:** Items from `docs/ops/SECURITY_GO_LIVE_GAPS_2026-04-08.md` closed: lockfile guard, error handling policy enforced, explicit CORS policy (if external), script governance. 
- **Expected evidence:** Links to PRs/commits that fixed gaps + CI green.
- **Pass when:** Documented closure + CI enforcements active.

---

## Final Go/No-Go Decision

> **Rule:** ทุก gate ต้องเป็น ✅ และ Sign-off ต้องครบตามตารางด้านล่างจึงถือเป็น “GO”. ถ้ามีข้อใดเป็น No-Go ให้ทำ remediation ตามหมวด “If NO-GO” ก่อนพิจารณาใหม่.

---

## Sign-off (ลงชื่อเป็นลายลักษณ์อิเล็กทรอนิกส์ใน PR หรือเติมตารางนี้)

**ให้กรอกข้อมูล: ชื่อ (GitHub handle) / ตำแหน่ง / วันที่ / comment (ถ้ามี)**

| Role (required) | Name (GitHub / Full) | Approval (✓) | Date | Notes / Link to Evidence |
| --------------- | -------------------: | :----------: | ---: | ------------------------ |
| QA Lead         |                      |              |      |                          |
| Security Lead   |                      |              |      |                          |
| Ops Lead        |                      |              |      |                          |
| Product Owner   |                      |              |      |                          |
| Release Manager |                      |              |      |                          |

**Sign-off method (recommended):** Each lead posts a single-line approval comment in the PR with the text:
`/approve-go` — followed by name/date and link to primary evidence. The Release Manager confirms all approvals and updates this document.

---

## PR Template (paste into PR description or into `.github/PULL_REQUEST_TEMPLATE.md`)

> **Copy this block into your PR description.** Fill all sections before requesting sign-off.

```
### PR: [Short title]

**Summary**
- What changed (brief)
- Why (brief)

**Files of interest**
- (list of changed files)

**Pre-merge checks**
- [ ] Unit tests (link)
- [ ] Integration tests (link)
- [ ] Security checks (ci-security) (link)
- [ ] E2E tests (e2e-playwright-docker) (link)

**Deployment & Runbook**
- Vercel env updated: (list)
- Supabase migrations applied: (list & link)
- DSG Core readiness: (curl output / link)

**Smoke tests & Quickstart**
- Health endpoint: (curl output or link)
- Sample execution: (response snippet)
- Quickstart flow tested: (screenshots / logs / link)

**Monitoring & Alerts**
- Alerts configured: (link)
- On-call owner: @username

**Rollback plan**
- Short description & primary contact

**Security**
- gitleaks: (report link / pass)
- npm audit: (pass / details)
- check-error-handlers: (pass / details)
- Script governance: (link to doc/PR)

**Requesting Sign-off**
- QA Lead: @
- Security Lead: @
- Ops Lead: @
- Product Owner: @
- Release Manager: @

(After all checks are green and signatures obtained, Release Manager may merge)
```

---

## If NO-GO (remediation process)

1. Document the failing gate in PR comment with logs & proposed fix.
2. Assign owner(s) and estimate ETA for fix.
3. Block merge until fix is applied and the relevant CI re-run passes.
4. After fix, update evidence and request sign-off again.

---

## After Merge — Post-deploy checklist

1. Deploy to staging → run full CI + E2E + smoke tests.
2. Deploy to production canary / limited audience. Monitor for 15–60 minutes.
3. Ramp gradually per RUNBOOK.
4. Maintain heightened observation for first 24 hours.

---

## References

* `docs/RUNBOOK_DEPLOY.md` — Deploy & migrations (required env list & commands). 
* `TEST_EXECUTION_SUMMARY.md` — Example test summary; useful for CI evidence. 
* `docs/ops/SECURITY_GO_LIVE_GAPS_2026-04-08.md` — Security Go-Live items to close (CI lockfile, error-handling, CORS, script governance). 

---

## Commit & Add to repo

หลังตรวจและพอใจ ให้รัน (ตัวอย่าง):

```bash
git checkout -b release/go-no-go
git add docs/ops/GO_NO_GO.md
git commit -m "docs(ops): add GO_NO_GO release checklist and PR template"
git push origin release/go-no-go
# เปิด PR และขอ reviewers (QA, Security, Ops, Product)
```

*
