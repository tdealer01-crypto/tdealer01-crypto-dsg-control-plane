# AGENTS.md — DSG Control Plane Permanent Agent Memory

Scope: this file applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## User-first operating rules

- Do not put false text, fake evidence, invented status, or guessed facts into the computer system, repository, docs, PRs, commits, tests, or responses.
- Alternate between the user perspective and the implementer perspective; never optimize for convenience if it conflicts with the user's real benefit.
- Do not try to please the user by overstating progress. If something is bad, unsafe, incomplete, or not production-ready, say so directly with current evidence.
- Do the correct thing, not the flattering thing.
- Never claim a file, route, test, deployment, database state, or external system exists unless you have inspected real evidence.
- Do not forget active context. If context is near the limit, stop, warn the user, summarize the current state, and propose a safe continuation plan.
- Do not randomize, assume, or guess when a deterministic check, repository inspection, or source lookup is possible.
- Prefer concrete, visible user value: simple flow, real result, observable evidence, and measurable acceptance.

## Deterministic reasoning and design

- Use Z3/formal-logic style thinking for critical design: state invariants, preconditions, postconditions, deny cases, and proof obligations before changing production logic.
- For parallel or multi-agent execution, follow the deterministic protocol in `docs/DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md`:
  1. T0 input lock.
  2. T1 dependency graph build.
  3. T2 isolated parallel execution for independent work.
  4. T3 deterministic merge by stable ordering.
  5. T4 verification gate with replay/hash/check evidence.
- Same input snapshot must produce the same final artifacts, test outcomes, and release decision.
- Fail fast on nondeterministic output, hidden shared state, wall-clock leakage, flaky evidence, or write collisions.

## DSG production posture

- Default to **NO-GO** for production/marketplace/enterprise claims unless current evidence proves every required gate is green.
- Use only two launch milestones unless the user explicitly changes scope:
  - `M1: Production Cutover`
  - `M2: Hardening + Launch`
- Reject new demo-only scope for launch readiness work, including new mock routes, server-memory source-of-truth, localStorage persistence, demo-only workflows, and demo-only pages.
- Production readiness requires DB-backed submit/approve/reject/escalate flows, server-side org/RBAC enforcement, DB-backed dashboard/read models, complete audit trails, entitlement gates, trust pages, health/readiness checks, and smoke evidence.
- Follow the marketplace and cutover standards in these repo references:
  - `docs/PRODUCTION_CUTOVER_2_ROUNDS_2026-04-11.md`
  - `docs/PRODUCTION_START_TIMELINE_2026-04-11.md`
  - `docs/MARKETPLACE_TOP_TIER_GAP_AND_GET_STARTED_2026-04-11.md`
  - `docs/MARKETPLACE_GET_STARTED_ACCEPTANCE_CHECKLIST_2026-04-11.md`
  - `docs/ORCHESTRATION_PLAN_M1_M2_2026-04-11.md`
  - `docs/ONE_DAY_14_TEAM_FEASIBILITY_2026-04-11.md`

## Evidence and verification rules

- Before answering repo-status questions or making claims, inspect the actual files and cite the exact files or commands used.
- For code changes, run the most relevant checks available in the repository and report exact commands with pass/fail/warning status.
- Do not hide failing tests. If a command fails because of an environment limitation, label it as a warning and explain the limitation.
- For launch claims, prefer the launch gate sequence documented by the DSG skills and scripts, including typecheck, tests, build, production manifest, health/readiness, trust pages, and protected-route behavior.
- For OpenAI API or OpenAPI function-calling work, prefer official OpenAI documentation and cookbook examples, including the OpenAI Cookbook OpenAPI function-calling notebook when relevant: `https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/Function_calling_with_an_OpenAPI_spec.ipynb`.

## User-facing delivery standard

- Always make the result easy for a real user to see, verify, and use.
- Explain decisions in plain language, but keep implementation evidence precise.
- If the best answer is "not ready," say "not ready" and provide the shortest safe path to readiness.
- Preserve Thai/English context where useful, but avoid mojibake. Store Thai text as valid UTF-8.

## Termux / Codex / Multica memory

- The practical path is Termux host → `proot-distro` → Debian guest → Codex CLI + Multica CLI/daemon.
- Use `scripts/termux-proot-codex-multica-setup.sh` and `docs/TERMUX_CODEX_MULTICA_STATUS_AND_PLAN.md` as the repo source of truth.
- Do not mark the Termux/Codex/Multica setup as merged or validated until real-device validation passes bootstrap, auth, daemon status, and an end-to-end smoke task.

## Commit and PR hygiene

- Keep changes focused and evidence-backed.
- Commit changes on the current branch when asked to modify the repository.
- Use clear commit messages that describe the actual repository change.
- PR bodies must summarize changed files, verification, and any known limitations without exaggerating readiness.

## Agent Skills Directory memory

The full 285-entry Agent Skills Directory from `agent_skills_directory.md.docx` is stored in repo under `docs/agent-skills-memory/` as chunked Markdown files.

Use it as a candidate registry only. Do not claim a skill is installed, active, maintained, safe, or compatible until the specific GitHub repo/path is verified directly. Preserve duplicates from the source because the uploaded directory contained duplicates.

Coverage currently expected:

- `docs/agent-skills-memory/skills-001-050.md`
- `docs/agent-skills-memory/skills-051-060.md`
- `docs/agent-skills-memory/skills-061-070.md`
- `docs/agent-skills-memory/skills-071-080.md`
- `docs/agent-skills-memory/skills-081-090.md`
- `docs/agent-skills-memory/skills-091-100.md`
- `docs/agent-skills-memory/skills-101-110.md`
- `docs/agent-skills-memory/skills-111-120.md`
- `docs/agent-skills-memory/skills-121-130.md`
- `docs/agent-skills-memory/skills-131-140.md`
- `docs/agent-skills-memory/skills-141-150.md`
- `docs/agent-skills-memory/skills-151.md`
- `docs/agent-skills-memory/skills-152-160.md`
- `docs/agent-skills-memory/skills-161-170.md`
- `docs/agent-skills-memory/skills-171-180.md`
- `docs/agent-skills-memory/skills-181-190.md`
- `docs/agent-skills-memory/skills-191-200.md`
- `docs/agent-skills-memory/skills-201-210.md`
- `docs/agent-skills-memory/skills-211-220.md`
- `docs/agent-skills-memory/skills-221-230.md`
- `docs/agent-skills-memory/skills-231-240.md`
- `docs/agent-skills-memory/skills-241-250.md`
- `docs/agent-skills-memory/skills-251-260.md`
- `docs/agent-skills-memory/skills-261-270.md`
- `docs/agent-skills-memory/skills-271-280.md`
- `docs/agent-skills-memory/skills-281-285.md`

---

## DSG GraphMap Plugin — กฎการใช้งานสำหรับ agent (2026-05-26)

### ใช้เมื่อไหร่

ก่อนตอบคำถามเกี่ยวกับโครงสร้าง repo ต้อง query GraphMap ก่อนเสมอ ตัวอย่างคำถามที่ต้อง query ก่อน:

- "route ไหนแตะ table ไหน"
- "policy / gate ไหนคุม API ไหน"
- "test ไหนควรเกี่ยวกับไฟล์นี้"
- "ไฟล์นี้ import จากที่ไหนบ้าง"
- "อะไรอยู่ใน directory เดียวกันกับไฟล์นี้"

### วิธีใช้

```
GET  /api/plugins/graphmap/status
  → ถ้า status=EMPTY หรือ isStale=true → POST /api/plugins/graphmap/build ก่อน

POST /api/plugins/graphmap/build
  body: {} (ใช้ default include/exclude patterns)
  → รอ ok: true, nodeCount > 0

POST /api/plugins/graphmap/query
  body: { "question": "<คำถามเกี่ยวกับ repo>", "max_depth": 2 }
  → อ่าน decision + evidence ก่อนตอบ
```

### กฎการตีความ decision

| decision | ความหมาย | สิ่งที่ agent ควรทำ |
|---|---|---|
| `ALLOW` | หลักฐาน EXTRACTED ≥3 ชิ้น graph ไม่เก่า | ตอบได้โดยอ้างอิง evidence |
| `REVIEW` | มี INFERRED หรือ graph เก่ากว่า 24h | ตอบแบบ "น่าจะ" บอก confidence ด้วย |
| `BLOCK` | ไม่มี evidence | ห้ามเดา — บอก user ว่าต้อง build graph ก่อน |

### ห้ามทำ

- ห้ามตอบคำถาม repo structure โดยไม่ query GraphMap ก่อน
- ห้าม claim ว่า "route X แตะ table Y" ถ้า decision เป็น BLOCK หรือ REVIEW + confidence INFERRED
- ห้าม build graph ถ้า status=READY และ isStale=false (ใช้ของเดิมได้)

### Auth

ทุก endpoint ต้องส่ง `Authorization: Bearer <supabase_jwt>` — ดึง token จาก user session ที่ login อยู่

---

## งานที่ทำไปแล้ว (2026-05-16) — branch `claude/analyze-files-RHRKg` → merged to `main`

### Security fixes
- **`lib/auth/safe-next.ts`** — แก้ open redirect ผ่าน `/\evil.com` backslash bypass โดยเพิ่มเช็ค `value[1] === '\\'` ใน `sanitizeRedirect()`
- **`middleware.ts`** — เพิ่ม `/approvals` และ `/gateway/monitor` เข้า `isProtectedPath()` ที่เคยไม่ถูก protect

### ไฟล์ใหม่: Market parity features
- `app/dashboard/team/page.tsx` + `app/api/team/route.ts` — Team management (invite/revoke, roles: OWNER/ADMIN/OPERATOR/VIEWER)
- `app/dashboard/api-keys/page.tsx` + `app/api/api-keys/route.ts` + `app/api/api-keys/[id]/route.ts` — API key management (scopes, expiry, show-once reveal, `dsg_live_` prefix)
- `app/dashboard/webhooks/page.tsx` + `app/api/webhooks-config/route.ts` + `app/api/webhooks-config/[id]/route.ts` — Webhook management (ใช้ `webhooks-config` ไม่ใช่ `webhooks` เพื่อไม่ชนกับ Stripe webhook route เดิม)
- `app/dashboard/notifications/page.tsx` + `app/api/notifications/route.ts` + `app/api/notification-settings/route.ts` — Notifications feed + email/Slack/PagerDuty preferences

### ไฟล์ใหม่: UI/UX components
- `app/dashboard/_components/DashboardShell.tsx` — Left sidebar 240px แทน horizontal scroll nav 19 items แบ่ง 4 section: Monitor / Governance / Connect / Settings
- `app/dashboard/layout.tsx` (updated) — เปลี่ยนเป็น Server Component บาง renders `<DashboardShell>`
- `components/GlobalNav.tsx` (updated) — ลดจาก 9 flat items เหลือ 4 items + Product hover dropdown
- `components/ToastProvider.tsx` — Global toast (success/error/info/warning, auto-dismiss, slide-in CSS animation, ไม่ใช้ framer-motion)
- `components/Skeleton.tsx` — 5 skeleton variants: `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonText`, `SkeletonStat`
- `components/OnboardingChecklist.tsx` — 6-step operator onboarding, localStorage-persisted (`dsg_cp_*` keys), dismissible
- `components/QuickActions.tsx` — Quick actions widget บน dashboard
- `app/layout.tsx` (updated) — เพิ่ม `<ToastProvider>` ครอบ body

### กฎที่ต้องรู้สำหรับ agent ที่จะทำต่อ
- **`installCommand` ใน `vercel.json` เปลี่ยนเป็น `npm install` แล้ว** (ไม่ใช่ `npm ci`) เพราะ `package-lock.json` ไม่ sync กับ `lucide-react` ที่เพิ่มเข้ามา
- **`lucide-react: ^0.460.0`** เพิ่มใน `package.json` dependencies แล้ว — ถ้าใครเพิ่มไฟล์ใหม่ที่ import lucide ไม่ต้องเพิ่มซ้ำ
- **`components/Skeleton.tsx` ใช้ inline `cx()` helper** ไม่ใช้ `cn` จาก `@/lib/utils` เพราะไฟล์นั้นไม่มีใน repo นี้
- **API route pattern (Next.js 15):** async params ต้องใช้ `params: Promise<{id: string}>` และ `await params` ก่อนใช้
- **vitest ผ่านไม่ได้หมายความว่า `next build` ผ่าน** — test suite เทส API logic เท่านั้น ไม่ compile Next.js pages

### งานที่ยังต้องทำ (ยังเป็น UI mock / ไม่มี DB จริง)
- Pages ใหม่ทั้งหมด (team, api-keys, webhooks, notifications) ยังใช้ mock data ใน API routes — ต้องต่อ Supabase tables จริงก่อน production
- `components/OnboardingChecklist.tsx` ใช้ localStorage เท่านั้น ยังไม่ persist ใน DB
- `components/QuickActions.tsx` เรียก `/api/dsg/v1/gates/evaluate` — ต้องตรวจสอบว่า route นั้นมีอยู่จริงและ auth ถูกต้อง
