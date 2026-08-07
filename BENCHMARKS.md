# BENCHMARKS.md - DSG Control Plane Benchmarks

> ภาษาไทย: ผลวัดจริงจาก production https://tdealer01-crypto-dsg-control-plane.vercel.app
> English: Real production metrics, not marketing.

**Last verified: 2026-08-07** — see [Evidence log — 2026-08-07](#evidence-log--2026-08-07) below for exact commands and raw output. Numbers not re-run on that date are marked `(unverified this run)` with their last-known source; they are carried forward as history, not re-claimed as fresh.

## สรุปสั้นสำหรับคนรีบ
DSG ONE เทสผ่าน **4376/4376 (0 fail)**, typecheck สะอาด, `next build` ผ่าน, Z3 formal proof 8/8 theorems + revenue-safety proof 15/15 checks (verified 2026-08-07). Gate Latency 11ms และ Mutation 72.08% เป็นตัวเลขเก่าที่ยังไม่ได้ verify รอบนี้ (ต้องใช้ DSG API key ที่ session นี้ไม่มี — ดูรายละเอียดด้านล่าง)

## ตารางเทียบตลาด AI Governance / AI Agent Framework 2026

| ตัวชี้วัดที่ Auditor ขอดู | DSG ONE (คุณ) | LangGraph / AutoGen / OpenAI Agents | SaaS ทั่วไปในตลาด |
| :--- | :--- | :--- | :--- |
| **Total Tests Passing** | **4376/4376 (0 fail)**, 337/356 files run (19 skipped), 156 tests skipped — verified 2026-08-07 | ไม่เปิดเผย, ส่วนใหญ่ <500 tests | 200-800 tests |
| **TypeScript typecheck / next build** | **0 errors**, `next build` exit 0 — verified 2026-08-07 | ไม่เปิดเผย | ไม่เปิดเผย |
| **Z3 Formal Proof (policy engine)** | **8/8 theorems proved** (5 core + 3 DeFi) — verified 2026-08-07 | ไม่มี | ไม่มี |
| **Revenue-safety formal proof** | **15/15 checks PASS** (`tools/proofs/prove_revenue_ready.py`) — verified 2026-08-07 | ไม่มี | ไม่มี |
| **Mutation Score** | 72.08% *(unverified this run — Stryker not re-executed 2026-08-07; not re-claimed as current)* | ไม่มีการวัด | 45-55% คือเก่งแล้ว |
| **Deterministic Replay** | ทำซ้ำได้ 100% ตามเอกสารเดิม *(unverified this run — no live replay evidence collected 2026-08-07)* | ทำซ้ำไม่ได้ เพราะพึ่ง LLM | ทำซ้ำไม่ได้ |
| **Gate Latency (ตัดสินก่อนรัน)** | 8-15ms avg 11ms ตามเอกสารเดิม *(unverified this run — live `/api/dsg/v1/gates/evaluate` and `/api/gateway/webhook/inbox` execute now require a DSG API key/session; this session had none, calls returned 401)* | 800-1500ms (ต้องเรียก LLM) | 100-300ms |
| **Tamper Evidence** | **SHA-256 requestHash → recordHash → bundleHash → MerkleRoot** (structural claim; hashes observed live in gateway benchmark audit-events read, 2026-08-07) | ไม่มี | มีแค่ log ธรรมดา |
| **Policy Language** | **ไทย + อังกฤษ** พิมพ์ว่า "ห้ามโอนเกิน 50,000" ได้เลย | อังกฤษเท่านั้น ต้องเขียนโค้ด | ต้องเขียนโค้ด |
| **Compliance Export** | **PDPA มาตรา 37, EU AI Act Art 12/14 Annex IV, ISO 42001, CCVS L1-L5** *(unverified this run)* | ไม่มี | ทำมือ |

## ทำไม Mutation 72.08% ถึงสูงกว่าตลาด
Mutation Testing คือการแก้โค้ดให้พังแบบสุ่มแล้วดูว่าเทสจับได้ไหม
- ตลาด SaaS เฉลี่ย 45-55% ก็ถือว่าดี
- DSG ได้ 72.08% แปลว่าเทสไม่ได้เขียนหลอก เอาไว้กันบั๊กซ่อนที่ทำให้เงินหายหรือหลักฐานปลอมได้

## วิธีพิสูจน์ด้วยตัวเอง (Proof Marketing)
1. ไปที่ /showcase กดปุ่ม "รัน Gate" 2 ครั้ง ดูว่า requestHash, proofHash เหมือนเดิม 100%
2. ลองแก้ตัวอักษรเดียวใน Evidence แล้วดูระบบขึ้น TAMPER DETECTED
3. ดูเวลา Gate 11ms เทียบกับ LLM

นี่คือเหตุผลที่ธนาคาร ประกัน และบริษัทที่โดน PDPA ต้องใช้ DSG ก่อนปล่อย AI ไปแตะเงินจริง

## Keywords สำหรับ SEO
AI governance Thailand, PDPA compliance tool, ระบบตรวจสอบ AI, AI audit trail, deterministic AI gateway, EU AI Act Thailand, ISO 42001 evidence pack, ระบบกัน AI โอนเงินมั่ว

## Evidence log — 2026-08-07

Ran from a fresh clone on branch `claude/dsg-agent-harness-benchmark-olokn2`, commit `a0ff081`. All commands below were actually executed this session; raw output summarized, not fabricated.

| Command | Result |
| :--- | :--- |
| `npm ci` | 1103 packages installed. `EBADENGINE` warning: repo requires Node >=24.0.0, this environment ran Node v22.22.2 — noted as a known limit, not blocking. |
| `npm run typecheck` | **PASS** — 0 errors (`tsc --noEmit -p tsconfig.typecheck.json`) |
| `npm run build` | **PASS** — `next build` exit code 0, full route manifest generated |
| `npm run test` | **4376 passed, 156 skipped, 0 failed** (4532 total) across **337 passed / 19 skipped test files (356 total)**. Duration 72.48s. |
| `npm run verify:policy` | **PASS** — Z3 formal verification: 5/5 core policy theorems proved (`role_safety`, `plan_safety`, `approval_safety`, `audit_completeness`, `non_triviality`) + 3/3 DeFi constraint theorems (`amount_bound`, `slippage_bound`, `constraint_consistency`). Total: **8/8 theorems proved.** |
| `npm run proof:revenue` | **PASS** — `tools/proofs/prove_revenue_ready.py`: **15/15** revenue-safety impossibility checks passed (e.g. execution without user/org/credential, over-quota execution, blocked-decision-with-side-effect — all proved impossible). VERDICT: FORMAL PROOF PASS. |
| `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status` | **200 OK** — `{"ok":true,"repo":"dsg-control-plane","commit":"bb044e33dc11f30a5ba4e1494f191d87c8d1afa1","env":"production","checks":{"db":true}}` |
| `npm run benchmark:gateway` (live, unauthenticated) | **3/6 checks passed** (`artifacts/gateway-benchmark/gateway-benchmark-result.json`). `register_connector` succeeded (200, 5134ms). `gateway_execute_custom_http` and `monitor_plan_check` both returned **401 Unauthorized** — this session had no DSG API key or Supabase session, so the gate/execute path could not be exercised. `audit_events`/`audit_export` read succeeded and returned real `request_hash`/`decision_hash`/`record_hash` values from prior committed runs. |
| `node scripts/master-agent-loop-harness.mjs` (live) | Fast-lane (tier 0, no gate call) steps completed normally. Full-lane step calling `POST /api/dsg/v1/gates/evaluate` returned `401 Unauthorized` for the same reason — decision came back `undefined`/blocked, not a real PASS/REVIEW/BLOCK gate ruling. **Not usable as a latency/decision benchmark without credentials.** |
| `npm run test:mutation:ci` (Stryker) | **Not run this session** — full mutation run is long-running; last-known score (72.08%) is carried forward as history, not re-claimed as current. |

**Blocked, not fabricated:** `/api/dsg/v1/gates/evaluate` and the gateway execute path now enforce `requireDsgAuth` (Supabase session or `api_keys` Bearer token with a `gates:evaluate`/`write`/`admin`/`read` scope — see `lib/dsg/auth/require-dsg-auth.ts`). To refresh the live 8-15ms gate-latency and gateway-execution numbers, re-run with real credentials:

```bash
export BENCHMARK_BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
export BENCHMARK_API_KEY="dsg_live_xxx"
export BENCHMARK_AGENT_ID="<agent-uuid>"
node scripts/benchmark-dsg.mjs
# or, for the gateway execute path:
export GATEWAY_BENCHMARK_BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
npm run benchmark:gateway
```

## อ้างอิง Production
- Live: https://tdealer01-crypto-dsg-control-plane.vercel.app (commit `bb044e33dc11f30a5ba4e1494f191d87c8d1afa1`, env `production`, db check `true` — verified 2026-08-07)
- Tests: **4376/4376 passing (0 fail)**, 337/356 files run (19 skipped) — verified 2026-08-07 (superseded prior claim: 3389/3389, 285 files)
- Formal proof: Z3 policy engine 8/8 theorems, revenue-safety 15/15 checks — verified 2026-08-07
- Public proof rail: /api/ccvs/compliance-status และ /api/compliance-evidence-pack/annex4 *(not re-queried this session)*
- Claim Boundary: live policy engine, CCVS v1.2 evidence chain (L1-L5) *(not re-verified this session)*, 4376 tests (356 files, 19 skipped), mutation score 72.08% *(unverified this run — carried from prior evidence, not re-measured)*. Gate latency and live-authenticated gateway execution are **pending** — require a DSG API key/Supabase session not available in this session.
