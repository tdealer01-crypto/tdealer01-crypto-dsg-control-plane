# Deterministic Autonomous Agent Blueprint — DSG ONE / ProofGate

วันที่จัดทำ: 2026-07-04
สถานะเอกสาร: design blueprint (docs-only) — ยังไม่มีการ implement เพิ่มจากเอกสารฉบับนี้
Branch: `claude/agi-system-design-aevo2v`

---

## 1. วัตถุประสงค์และขอบเขต claim

เอกสารนี้คือพิมพ์เขียว (blueprint) สำหรับสร้าง **deterministic autonomous agent runtime** — ระบบ agent เสมือนที่ทำงานครบวงจร **คิด → วิเคราะห์ → วางแผน → ลงมือ → ตรวจสอบ → แก้ไข** แบบอัตโนมัติ โดยจำลองความสามารถของ agent runtime แบบ Claude Code (tools / skills / MCP / CLI / API) ขึ้นใหม่บนโครงสร้างพื้นฐานที่มีอยู่แล้วใน repository นี้ และบังคับให้ทุกขั้นตอนตรวจสอบซ้ำได้ (replayable) ด้วย snapshot + hash + gate

### 1.1 ขอบเขต claim (บังคับตาม `CLAUDE.md` §1 และ `AGENTS.md`)

| ประเภท claim | สถานะ |
|---|---|
| "deterministic agent scaffold / blueprint" | อนุญาต — คือสิ่งที่เอกสารนี้เป็น |
| "governance-enabling", "evidence-ready", "setup-ready" | อนุญาตเมื่อมีหลักฐานประกอบ |
| "AGI สำเร็จแล้ว / general intelligence" | **ห้าม** — ไม่มีหลักฐานรองรับ และไม่ใช่สิ่งที่ระบบนี้เป็น |
| "agent ทำงานอัตโนมัติเต็มรูปแบบใน production แล้ว" | **ห้าม** — สถานะปัจจุบันคือ scaffold + gap (ดู §8) |
| "external production Z3 solver invocation" | **ห้าม** — route deterministic gate ระบุชัดว่าไม่เรียก Z3 จริง |

หลักการสำคัญที่สุดของพิมพ์เขียวนี้:

> **LLM (ขั้น "คิด/วางแผน") เป็นองค์ประกอบ non-deterministic โดยธรรมชาติ**
> ระบบจะ deterministic ได้ก็ต่อเมื่อ output ของ LLM ถูกแปลงเป็น **immutable plan snapshot + hash** ก่อน แล้วให้ทุกขั้นหลังจากนั้น (gate → execute → verify → commit) ทำงานกับ snapshot ที่ hash ล็อกไว้เท่านั้น — ไม่มีขั้นไหนทำงานกับ output สดของ LLM โดยตรง

นิยาม "deterministic" ที่ใช้ทั้งเอกสาร (ตาม `AGENTS.md` §Deterministic reasoning): **same input snapshot ⇒ same final artifacts, same test outcomes, same release decision** และ fail fast เมื่อพบ nondeterministic output, hidden shared state, wall-clock leakage หรือ write collision

---

## 2. Inventory: สิ่งที่ agent runtime ปัจจุบัน (Claude Code session นี้) ใช้จริง

รายการต่อไปนี้เป็น `verified fact` จาก runtime ของ session ที่จัดทำเอกสารนี้ — ใช้เป็น "สเปกอ้างอิง" ของสิ่งที่ระบบใหม่ต้องทำงานเทียบเท่า

### 2.1 Core tools (เครื่องมือพื้นฐานของ harness)

| Tool | หน้าที่ | ลักษณะสำคัญ |
|---|---|---|
| `Read` | อ่านไฟล์ (มี offset/limit, อ่านภาพ/PDF/notebook ได้) | pure read, ไม่มี side effect |
| `Write` | เขียนไฟล์ทั้งไฟล์ (บังคับ Read ก่อนถ้าไฟล์มีอยู่) | precondition ป้องกัน blind overwrite |
| `Edit` | แทนที่ string แบบ exact-match ในไฟล์ | ล้มเหลวถ้า `old_string` ไม่ unique — ป้องกัน edit ผิดจุด |
| `Glob` | ค้นหาไฟล์ตาม pattern | pure read |
| `Grep` | ค้นหาเนื้อหาด้วย regex (ripgrep) | pure read |
| `Bash` | รัน shell command (timeout, background mode, sandbox flag) | side-effecting — จุดเสี่ยงหลักที่ต้องมี whitelist |
| `Agent` | spawn subagent (Explore / Plan / general-purpose) พร้อม prompt เฉพาะกิจ | isolation + คืนผลเป็นข้อความสรุป |
| `Skill` | เรียก skill (slash command) ที่นิยามเป็นไฟล์ instruction | ขยายความสามารถแบบ declarative |
| `AskUserQuestion` | ถามผู้ใช้เมื่อการตัดสินใจเป็นของผู้ใช้จริง ๆ | escalation ไปมนุษย์ |
| `WebSearch` / `WebFetch` | ค้น/ดึงข้อมูลภายนอก | non-deterministic — ต้อง snapshot ผลลัพธ์ |
| `TaskCreate/TaskUpdate/...` | task list ติดตามความคืบหน้า | สถานะงานตรวจสอบได้ |
| `ScheduleWakeup` / `send_later` / triggers | ปลุกตัวเองตามเวลา → ทำงานอัตโนมัติต่อเนื่อง | หัวใจของ autonomous loop |
| `Artifact` / `SendUserFile` | ส่งมอบผลลัพธ์เป็นหน้าเว็บ/ไฟล์ | delivery channel |

### 2.2 Skills system

- skill = ไฟล์ instruction (SKILL.md) + trigger + optional scripts — เรียกผ่าน `Skill` tool หรือ `/<name>`
- ตัวอย่างที่มีจริงใน session นี้: `verify`, `code-review`, `simplify`, `security-review`, `loop`, `init`, `claude-api`
- ฝั่ง repo นี้มี registry ของตัวเองอยู่แล้ว: `docs/agent-skills-memory/` (26 ไฟล์, ~285 รายการ — เป็น candidate registry เท่านั้น ห้าม claim ว่า installed/active จนกว่าจะ verify ราย repo), `lib/agent-v2/skills.ts`, `lib/hermes/skills/registry.ts`, `docs/openapi-agent-skills.yaml`

### 2.3 MCP (Model Context Protocol)

- ฝั่ง session นี้: ต่อ MCP servers ภายนอกจริง เช่น `github`, `Supabase`, `Vercel`, `Stripe`, `PostHog`, `Gmail`, `Google_Drive`, `Shopify` — แต่ละ server ส่งมอบ tool schema (JSON Schema) ให้ model เรียกแบบ typed tool call
- ฝั่ง repo นี้ **มี MCP surface ของตัวเองอยู่แล้ว** (verified จากการ inspect ไฟล์):
  - routes: `app/api/mcp/route.ts`, `app/api/mcp/manifest/route.ts`, `app/api/mcp/call/route.ts`, `app/api/mcp-server/route.ts`, `app/api/dsg/mcp/keys/`, `app/api/dsg/mcp/subscribe/`
  - libraries: `lib/mcp/dsg-tools.ts`, `lib/mcp/hermes-tools.ts`, `lib/mcp/hermes-tool-schemas.ts`, `lib/mcp/schemas.ts`, `lib/dsg/mcp/validate-api-key.ts`, `lib/dsg/mcp/api-key-crypto.ts`
- ข้อสรุปเชิงออกแบบ: pillar "MCP" ของระบบใหม่ **ต่อเข้ากับ transport เดิม** (`app/api/mcp/*` + `lib/mcp/*`) ไม่สร้าง transport ใหม่

### 2.4 CLI / harness

สิ่งที่ Claude Code CLI ให้และระบบใหม่ต้องมี equivalent:

- **permission modes** — ระดับการอนุญาตต่อ tool call (ask / allow / deny) → เทียบเท่า `ExecutionGrant` + whitelist ใน repo นี้
- **plan mode** — บังคับ read-only จนกว่าแผนจะถูกอนุมัติ → เทียบเท่า `PlanAttempt` ที่ต้องผ่าน gate ก่อน execute
- **hooks** — คำสั่งที่ harness รันเมื่อเกิด event → เทียบเท่า pipeline stage/plugin ใน `lib/spine/`
- **persistent memory** — `CLAUDE.md` / `AGENTS.md` ถูก inject เข้า context ทุก session → repo นี้ใช้ไฟล์เดียวกันนี้อยู่แล้วเป็น memory layer
- **subagent orchestration** — แตกงานให้ agent ลูกแบบ isolated

### 2.5 API

- ชั้นล่างสุดคือ **Anthropic Messages API + tool_use loop**: model ส่ง `tool_use` block → harness รัน tool → ส่ง `tool_result` กลับ → วนจนได้คำตอบ
- ฝั่ง repo มี LLM bridge ของตัวเองแล้ว: `lib/dsg/brain/hermes-llm.ts` (Anthropic SDK), `lib/dsg/brain/hermes-nous-provider.ts` (Together AI / OpenRouter), เลือก provider ผ่าน `lib/dsg/brain/model-config.ts` (`DSG_BRAIN_PROVIDER`, ระบุชื่อ env vars เท่านั้น — ไม่มี value ใน repo)

---

## 3. วงจรการทำงาน 6 ขั้น (คิด → วิเคราะห์ → วางแผน → ลงมือ → ตรวจสอบ → แก้ไข)

ทุกขั้น map เข้ากับโค้ดที่มีอยู่จริงใน repo — คอลัมน์ "สถานะ" คือสถานะของ building block นั้น ณ วันที่จัดทำ (จากการ inspect ไฟล์ ไม่ใช่จากเอกสารเก่า)

| # | ขั้น | หน้าที่ | Building block ใน repo | สถานะ |
|---|---|---|---|---|
| 1 | **คิด (Observe/Orient)** | รวบรวม context: อ่านไฟล์, ค้น repo, อ่าน memory (`AGENTS.md`/`CLAUDE.md`), query GraphMap ก่อนตอบคำถามโครงสร้าง repo | GraphMap plugin (`/api/plugins/graphmap/*` ตามกฎใน `AGENTS.md`), skills registry | มีจริง (GraphMap ตามกฎ AGENTS.md) |
| 2 | **วิเคราะห์ (Classify)** | จัดทุกข้อความสำคัญเป็น `verified fact` / `inference` / `pending` / `blocked` / `not verified` ก่อนตัดสินใจ | กติกาใน `CLAUDE.md` §0 ข้อ 5 — ระบบใหม่ต้องบังคับใน schema ของ plan | เป็นกติกา — ยังไม่ถูก encode เป็น type ในโค้ด (`pending`) |
| 3 | **วางแผน (Plan)** | LLM เสนอแผน → freeze เป็น immutable snapshot + `planHash` | `lib/dsg/brain/plan-attempt.ts` — `buildPlanAttempt()`, `verifyPlanHash()`; planHash = sha256 ของ `{canonicalPlan, policyVersion, invariantVersion, toolManifestHash}` | มีจริง (pure logic) แต่ `proposePlan()` ใน `hermes-plugin.ts` ยังเป็น deterministic stub — LLM bridge จริงอยู่ที่ `hermes-llm.ts` ยังไม่ได้ต่อเข้า plugin |
| 4 | **ลงมือ (Act)** | execute ภายใต้ grant ที่ผูกกับ planHash + command whitelist + allowed paths + credential lease (fingerprint เท่านั้น ไม่มี raw secret) | `lib/dsg/brain/controlled-executor.ts` (`ExecutionGrant` TTL 5 นาที, renew สูงสุด 2 ครั้ง), `shell-executor.ts` (execSync + `DANGEROUS_COMMANDS` blacklist + `FORBIDDEN_PATHS`), `credential-broker.ts` (`dsg_secrets`) | logic มีจริง; runner จริงใน `createShellExecutor()` ยังเป็น demo (`echo`) — ดู gap §8 |
| 5 | **ตรวจสอบ (Verify)** | conformance check 4 กฎ: planHash ตรงกับที่อนุมัติ / ทุก command อยู่ใน whitelist / ทุก path อยู่ใต้ allowedPaths / evidence ต้องไม่ว่าง — ไม่ผ่านข้อใดข้อหนึ่ง = BLOCK | `lib/dsg/brain/conformance-gate.ts` — `checkConformance()`, `assertConformance()` (throw `CONFORMANCE BLOCK`) + T4 replay/hash gate ตาม `docs/DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md` | มีจริง (conformance gate); replay harness ตาม T4 ยังไม่มีเป็นโค้ด (`pending`) |
| 6 | **แก้ไข (Remediate)** | เมื่อ verify ไม่ผ่าน: **ห้าม mutate plan เดิม** — สร้าง `PlanAttempt` ใหม่ (planHash ใหม่) จาก violation report แล้ววนกลับขั้น 3 | `hermes-plugin.ts` → `remediatePlan()` (ยัง stub), `remediatePlanViaNousHermes()` ใน `hermes-nous-provider.ts` | scaffold — ต้องต่อ LLM bridge เช่นเดียวกับขั้น 3 |

กติกากลางของวงจร:

1. ไม่มีทางลัดข้ามขั้น — governed execution ทุกครั้งต้องออกทาง spine (`/api/execute`, `/api/intent`, `/api/spine/execute`) ตาม `CLAUDE.md` §11
2. `UNSUPPORTED` ไม่มีวันกลายเป็น `PASS` — mapping ที่ปลอดภัยคือ REVIEW (low risk) หรือ BLOCK (medium/high risk) ตาม `lib/dsg/deterministic/gate-engine.ts`
3. ทุก loop iteration ผลิต evidence — ไม่มี evidence = conformance BLOCK

---

## 4. สถาปัตยกรรม deterministic (layer diagram)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ L6  PERSONA (ตัวตนเสมือน — ดู §6)                                    │
│     system prompt + policy version + toolManifestHash + memory      │
│     + role boundary + autonomy dial                                 │
├─────────────────────────────────────────────────────────────────────┤
│ L5  PLANNER (LLM — non-deterministic โดยธรรมชาติ)                    │
│     hermes-llm.ts / hermes-nous-provider.ts / model-config.ts       │
│     output ถูก freeze เป็น PlanAttempt + planHash (plan-attempt.ts) │
│     ── จุดตัด: หลังบรรทัดนี้ ไม่มีขั้นไหนแตะ output สดของ LLM ──      │
├─────────────────────────────────────────────────────────────────────┤
│ L4  DETERMINISTIC GATE (lib/dsg/deterministic/)                     │
│     proveDeterministicPlan() → PASS / REVIEW / BLOCK / UNSUPPORTED  │
│     evaluateDeterministicGate() → gate decision + proofHash         │
│     + replay protection (nonce, idempotencyKey, requestHash)        │
├─────────────────────────────────────────────────────────────────────┤
│ L3  CONTROLLED EXECUTOR (lib/dsg/brain/)                            │
│     ExecutionGrant (ผูก planHash, TTL) + CredentialLease            │
│     (fingerprint เท่านั้น) + tool layer (§5) + shell-executor       │
├─────────────────────────────────────────────────────────────────────┤
│ L2  CONFORMANCE + VERIFICATION (conformance-gate.ts + T0–T4)        │
│     4 กฎ conformance + deterministic replay / output-hash เทียบ     │
│     baseline ตาม DETERMINISTIC_EXECUTION_PROTOCOL_10X               │
├─────────────────────────────────────────────────────────────────────┤
│ L1  SPINE + EVIDENCE COMMIT (lib/spine/ + lib/runtime/)             │
│     runPipeline() → ALLOW / STABILIZE / BLOCK (most-severe-wins)    │
│     canonicalHash() → RPC runtime_commit_execution                  │
│     → lineage / audit / truth state ใน Supabase                     │
└─────────────────────────────────────────────────────────────────────┘
```

หลักการต่อ layer:

- **L5 → L4:** ทุก plan ที่จะถูกพิจารณา ต้องมี `planHash` ที่ recompute แล้วตรง (`verifyPlanHash`) — plan ที่แก้ไขภายหลังจะ hash ไม่ตรงและถูกปฏิเสธทันที
- **L4:** gate ตัดสินจาก context booleans + policy manifest เท่านั้น (ไม่มี wall-clock, ไม่มี random) — input เดียวกัน ⇒ decision เดียวกัน ⇒ proofHash เดียวกัน
- **L3:** สิทธิ์การลงมือทั้งหมดมาจาก `ExecutionGrant` ที่ผูก planHash — grant หมดอายุ = หยุด, เปลี่ยนแผน = ขอ grant ใหม่
- **L2:** ผล execute ที่ไม่ conform = BLOCK ไม่มีข้อยกเว้น และ artifact ที่ replay แล้ว hash ไม่ตรง baseline = fail fast
- **L1:** ทุก decision + canonical hash + evidence ลง audit trail ผ่าน RPC `runtime_commit_execution` (`lib/runtime/commit-rpc.ts`) — ห้ามเขียนอ้อม path นี้ (ตาม `CLAUDE.md` §11)
- **การแบ่งอำนาจ (separation of powers)** ตาม `lib/dsg/brain/execution-role-boundary.ts`: Hermes = worker (plan/execute ตามแผนที่อนุมัติ), Nango = credential/API authority, DSG = control plane (verify/approve/audit) — `decideExecutionBoundary()` คืน `allow | needs_user_takeover | deny`

---

## 5. Deterministic Tool Manifest (machine-readable)

สัญญาเครื่องมือ 9 ตัวที่จำลอง core tools ของ Claude Code (§2.1) ให้ทำงานภายใต้ conformance gate ของ repo นี้ ทั้ง manifest ถูก canonical-hash (ด้วย `sha256Hash` จาก `lib/dsg/brain/hash-utils.ts`) เป็น `toolManifestHash` ซึ่งเข้าไปเป็นส่วนหนึ่งของ `planHash` ใน `plan-attempt.ts` (field นี้มีอยู่แล้วในโค้ด) — เปลี่ยน manifest = planHash เดิมทั้งหมด invalid โดยอัตโนมัติ

ความหมายของ `determinismClass`:

- `pure-read` — ไม่มี side effect; input เดียวกัน + filesystem snapshot เดียวกัน ⇒ output เดียวกัน
- `idempotent-write` — เขียนซ้ำด้วย input เดิมได้ผลลัพธ์สุดท้ายเหมือนเดิม (ปลอดภัยต่อ retry)
- `side-effecting` — มีผลข้างเคียงที่ replay ไม่ได้โดยตรง; ต้อง capture evidence hash และเดินผ่าน whitelist เสมอ
- `external-nondeterministic` — ผลลัพธ์ขึ้นกับระบบภายนอก; ต้อง snapshot response + hash ก่อนให้ขั้นถัดไปใช้

```json
{
  "manifestVersion": "1.0.0",
  "hashAlgorithm": "sha256-canonical-json",
  "hashImplementation": "lib/dsg/brain/hash-utils.ts#sha256Hash",
  "conformanceGate": "lib/dsg/brain/conformance-gate.ts#checkConformance",
  "tools": [
    {
      "id": "fs.read",
      "replicates": "Read",
      "determinismClass": "pure-read",
      "riskLevel": "low",
      "input": { "path": "string", "offset": "number?", "limit": "number?" },
      "preconditions": ["path canonicalized", "path under allowedPaths"],
      "evidence": ["sha256 of returned content", "path", "byte length"]
    },
    {
      "id": "fs.write",
      "replicates": "Write",
      "determinismClass": "idempotent-write",
      "riskLevel": "medium",
      "input": { "path": "string", "content": "string" },
      "preconditions": [
        "path under allowedPaths",
        "existing file must have been fs.read in same PlanAttempt"
      ],
      "evidence": ["sha256 before", "sha256 after", "path"]
    },
    {
      "id": "fs.edit",
      "replicates": "Edit",
      "determinismClass": "idempotent-write",
      "riskLevel": "medium",
      "input": { "path": "string", "oldString": "string", "newString": "string", "replaceAll": "boolean?" },
      "preconditions": [
        "path under allowedPaths",
        "oldString unique in file unless replaceAll",
        "file fs.read in same PlanAttempt"
      ],
      "evidence": ["sha256 before", "sha256 after", "match count"]
    },
    {
      "id": "search.glob",
      "replicates": "Glob",
      "determinismClass": "pure-read",
      "riskLevel": "low",
      "input": { "pattern": "string", "root": "string?" },
      "preconditions": ["root under allowedPaths"],
      "evidence": ["sorted result list hash"],
      "determinismNote": "results MUST be sorted by stable key (path), never by mtime"
    },
    {
      "id": "search.grep",
      "replicates": "Grep",
      "determinismClass": "pure-read",
      "riskLevel": "low",
      "input": { "pattern": "string", "path": "string?", "glob": "string?", "outputMode": "string?" },
      "preconditions": ["path under allowedPaths"],
      "evidence": ["sorted match list hash"]
    },
    {
      "id": "shell.exec",
      "replicates": "Bash",
      "determinismClass": "side-effecting",
      "riskLevel": "high",
      "input": { "command": "string", "timeoutMs": "number?" },
      "preconditions": [
        "command in ExecutionGrant.allowedCommands",
        "command not in DANGEROUS_COMMANDS blacklist (lib/dsg/brain/shell-executor.ts)",
        "no FORBIDDEN_PATHS touched",
        "grant valid (isGrantValid)"
      ],
      "evidence": ["sha256 of stdout", "sha256 of stderr", "exit code", "command string"]
    },
    {
      "id": "subagent.spawn",
      "replicates": "Agent",
      "determinismClass": "external-nondeterministic",
      "riskLevel": "medium",
      "input": { "agentType": "string", "prompt": "string", "isolation": "string?" },
      "preconditions": [
        "child inherits parent toolManifestHash",
        "child allowedPaths subset of parent allowedPaths",
        "child result frozen as snapshot + hash before parent consumes it"
      ],
      "evidence": ["child result hash", "child plan/attempt id"]
    },
    {
      "id": "skill.invoke",
      "replicates": "Skill",
      "determinismClass": "external-nondeterministic",
      "riskLevel": "medium",
      "input": { "skillId": "string", "args": "string?" },
      "preconditions": [
        "skillId resolved against verified registry (lib/hermes/skills/registry.ts or lib/agent-v2/skills.ts)",
        "docs/agent-skills-memory/ entries are candidates only, never auto-trusted"
      ],
      "evidence": ["skill instruction file hash", "invocation args"]
    },
    {
      "id": "mcp.call",
      "replicates": "MCP tool call",
      "determinismClass": "external-nondeterministic",
      "riskLevel": "high",
      "input": { "server": "string", "tool": "string", "args": "object" },
      "preconditions": [
        "routed through app/api/mcp/call (existing transport)",
        "API key validated via lib/dsg/mcp/validate-api-key.ts",
        "tool schema validated against lib/mcp/schemas.ts",
        "response snapshotted + hashed before downstream use"
      ],
      "evidence": ["request canonical hash", "response snapshot hash", "server+tool id"]
    }
  ]
}
```

การบังคับใช้ manifest:

1. `allowedCommands` / `allowedPaths` ใน `ExecutionGrant` (มีอยู่แล้วใน `controlled-executor.ts`, config ผ่าน `DSG_HERMES_ALLOWED_COMMANDS` / `DSG_HERMES_ALLOWED_PATHS`) คือ enforcement runtime ของ precondition ด้านบน
2. tool call ที่ไม่อยู่ใน manifest = ไม่มีทางถูก execute (default-deny)
3. เครื่องมือ `pure-read` เรียกได้ก่อนมี grant (เทียบ plan mode ของ Claude Code) — เครื่องมือ class อื่นทั้งหมดต้องมี grant ที่ valid

---

## 6. ตัวตนเสมือน (Virtual Persona) ทำงานอัตโนมัติ

Persona = ชุดค่าที่ประกอบเป็น "ตัวตน" ของ agent ซึ่งทั้งชุดต้อง canonical-hash ได้เป็น `personaHash` เพื่อให้ตอบได้เสมอว่า "การตัดสินใจครั้งนี้ ทำโดยตัวตนเวอร์ชันไหน"

### 6.1 Persona Spec

```text
PersonaSpec = {
  systemPrompt        : กติกาการทำงาน (มาตรฐานเดียวกับ CLAUDE.md/AGENTS.md ของ repo นี้)
  policyVersion       : เวอร์ชัน policy manifest (lib/dsg/deterministic/policy-manifest.ts)
  invariantVersion    : เวอร์ชัน invariants (field ที่มีอยู่แล้วใน plan-attempt.ts)
  toolManifestHash    : hash ของ manifest ใน §5
  memoryLayer         : AGENTS.md + CLAUDE.md + docs/agents/* + skills registry
  roleBoundary        : execution-role-boundary.ts (Hermes worker / Nango credential / DSG control)
  autonomyDial        : ระดับความอัตโนมัติ (แบบเดียวกับ AutonomyDial.kt ของ Android agent)
}
personaHash = sha256Hash(PersonaSpec)   // hash-utils.ts
```

### 6.2 Autonomy dial (ระดับความอัตโนมัติ)

เทียบเคียง `apps/android/.../automation/AutonomyDial.kt` + `PermissionGate.kt` + `OwnerApprovalSigner.kt` ที่มีอยู่แล้วบนฝั่ง Android:

| ระดับ | พฤติกรรม | เทียบ Claude Code |
|---|---|---|
| 0 — observe | pure-read เท่านั้น รายงานอย่างเดียว | plan mode |
| 1 — propose | สร้าง PlanAttempt + ขออนุมัติทุกแผน | default permission mode (ask) |
| 2 — bounded-auto | execute อัตโนมัติเฉพาะ plan ที่ gate = PASS และทุก tool call อยู่ใน manifest; REVIEW/BLOCK → escalate | acceptEdits + allowlist |
| 3 — supervised-auto | เหมือนระดับ 2 + remediation loop อัตโนมัติ (สูงสุด N รอบ) ; งาน irreversible ยัง escalate เสมอ | autonomous session + confirmation gate |

ทุกระดับ: `needs_user_takeover` จาก `decideExecutionBoundary()` ชนะ autonomy dial เสมอ (มนุษย์ > dial)

### 6.3 Autonomous operation loop

ช่องทางรับงาน + จังหวะทำงานอัตโนมัติ ใช้ของที่มี/นิยามไว้แล้ว:

1. **Command inbox** — รับงานตามรูปแบบ `docs/AGENT_COMMAND_INBOX.md` และ prefix `@claude` / `@codex` / `@agent` / `@dsg-agent` (เป็น task proposal เท่านั้น — ไม่ใช่สิทธิ์ merge/deploy ตาม `CLAUDE.md` §21)
2. **Scheduler/cron** — งานตามเวลาผ่าน cron routes ซึ่ง**ต้อง fail closed เมื่อไม่มี `CRON_SECRET`** (ตาม `CLAUDE.md` §9) ; ฝั่ง Android ใช้ `ScheduledTaskStore.kt` + `SchedulerReceiver.kt` เป็นแบบอย่าง
3. **Wakeup loop** — เทียบ `ScheduleWakeup`/`send_later` ของ session นี้: จบทุก iteration ด้วยการตั้งเวลาปลุกครั้งถัดไป + เขียนสถานะลง audit ก่อนหลับ
4. **Escalation** — `needs_user_takeover` → หยุดรอมนุษย์ (เทียบ `AskUserQuestion` + `OwnerApprovalSigner` ฝั่ง Android)

หนึ่ง iteration ของ persona อัตโนมัติ = วงจร 6 ขั้น (§3) หนึ่งรอบเต็ม จบด้วย evidence commit ผ่าน L1 เสมอ — ไม่มี iteration ที่หายไปจาก audit trail

---

## 7. ระบบการไหลของข้อมูลแบบ deterministic

ผูกวงจร §3 เข้ากับโปรโตคอล T0–T4 (`docs/DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md`) และ primitives ใน `lib/runtime/`:

```text
[T0 INPUT LOCK]
  งานเข้าจาก inbox/scheduler
  → freeze input snapshot (task text, repo commit SHA, policy version, personaHash)
  → canonicalJson() + canonicalHash()          (lib/runtime/canonical.ts)
  → ได้ run-id ที่ immutable

[T1 DEPENDENCY GRAPH]
  แตกงานเป็น DAG: อิสระ (P1) / partitioned writes (P2) / serial-only (S)
  → topo order คงที่

[PLAN]  LLM propose → PlanAttempt + planHash    (plan-attempt.ts)
[GATE]  evaluateDeterministicGate() → PASS/REVIEW/BLOCK + proofHash + replay
        protection (nonce, idempotencyKey, requestHash)   (lib/dsg/deterministic/)

[T2 EXECUTE]
  ทุก tool call ผ่าน manifest §5 ภายใต้ ExecutionGrant
  → ทุกผลลัพธ์ capture เป็น evidence hash (stdout/stderr/file before-after)
  → worker แบบ stateless, write scope แยกขาด (ไม่มี shared mutable state)

[T3 DETERMINISTIC MERGE]
  รวมผลจาก parallel nodes ด้วย ordering key คงที่ (stage, topo_index, task_id)
  → normalize output (line endings, sorted keys, fixed locale, UTC)
  → conflict policy: upstream-wins + conflict log ชัดเจน
  → manifest hash ของผลรวม

[T4 VERIFICATION GATE]
  conformance 4 กฎ (conformance-gate.ts)
  → replay หนึ่งครั้งจาก snapshot เดิม: output hash ต้องตรง byte-for-byte
  → ไม่ตรง = fail fast, ไม่มี partial pass

[COMMIT]
  runPipeline() (lib/spine/pipeline.ts) → final decision ALLOW/STABILIZE/BLOCK
  → RPC runtime_commit_execution (lib/runtime/commit-rpc.ts)
  → decision + canonical_hash + canonical_json + audit_evidence + usage
    ลง Supabase เป็น lineage/truth state
```

กฎเหล็กของ data flow:

1. **Same input snapshot ⇒ same decision, same artifacts, same hashes** — ตรวจได้ด้วย replay ที่ T4
2. ค่าที่ทำให้ nondeterministic ต้องถูก inject จาก T0 snapshot เท่านั้น: เวลา (ใช้ timestamp ที่ freeze ไว้), random (ห้าม หรือ seed จาก run-id), network response (snapshot + hash ก่อนใช้)
3. ทุก stage แปะ `proof_hash` ของตัวเอง (โครงมีแล้วใน `lib/spine/types.ts` — `PluginOutput.proof.proof_hash`)
4. ไม่มีข้อมูลไหลข้าม layer โดยไม่ผ่าน hash — "ข้อมูลที่ไม่มี hash กำกับ" ถือว่าไม่มีอยู่ในระบบ

---

## 8. Gap analysis (สถานะจริง ณ 2026-07-04 — จากการ inspect ไฟล์บน branch นี้)

| องค์ประกอบ | สถานะ | หลักฐาน/หมายเหตุ |
|---|---|---|
| canonical hash primitives | `verified fact` — มีจริง | `lib/runtime/canonical.ts`, `lib/dsg/brain/hash-utils.ts` |
| PlanAttempt + planHash (รองรับ toolManifestHash แล้ว) | `verified fact` — มีจริง | `lib/dsg/brain/plan-attempt.ts` |
| ExecutionGrant / CredentialLease logic | `verified fact` — มีจริง (pure logic) | `lib/dsg/brain/controlled-executor.ts` |
| Conformance gate 4 กฎ | `verified fact` — มีจริง | `lib/dsg/brain/conformance-gate.ts` |
| Deterministic proof/gate (PASS/REVIEW/BLOCK/UNSUPPORTED) | `verified fact` — มีจริงเป็น scaffold; **ไม่ใช่ external Z3 production solver** | `lib/dsg/deterministic/` |
| Spine pipeline + commit RPC | `verified fact` — โค้ดมีจริง | `lib/spine/pipeline.ts`, `lib/runtime/commit-rpc.ts` (RPC `runtime_commit_execution`) |
| MCP transport ภายใน repo | `verified fact` — route + schema + key crypto มีจริง | `app/api/mcp/*`, `lib/mcp/*`, `lib/dsg/mcp/*` |
| Tool layer `fs.read/fs.write/fs.edit/search.glob/search.grep` | **`not implemented`** — gap หลักอันดับ 1 | มีเฉพาะ shell executor; manifest §5 คือสเปกสำหรับ build |
| `shell.exec` runner จริง | `scaffold` — `executeCommand()` ใช้ได้จริง แต่ `createShellExecutor()` ยังรันแค่ demo `echo` | `lib/dsg/brain/shell-executor.ts` |
| `proposePlan()` / `remediatePlan()` ต่อ LLM จริง | `scaffold/stub` — plugin ยังคืนค่า placeholder; bridge จริง (`hermes-llm.ts`) มีแล้วแต่ยังไม่ถูกต่อ | `lib/dsg/brain/hermes-plugin.ts` |
| Replay harness ตาม T4 | **`not implemented`** — โปรโตคอลมีเป็นเอกสาร ยังไม่มีโค้ด | `docs/DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md` |
| ตาราง `dsg_secrets`, `dsg_execution_grants`, `dsg_credential_leases` บน live DB | **`not verified`** — โค้ด client มีจริง แต่ยังไม่มี query result ยืนยันสถานะ live; `dsg_secrets` ยังไม่อยู่ใน `lib/database.types.ts` (ใช้ `as any`) | `credential-broker.ts`, `grant-persistence.ts`, `lease-persistence.ts` |
| Classification schema (`verified fact`/`inference`/`pending`/`blocked`) เป็น type ในโค้ด | **`not implemented`** — ยังเป็นกติกาในเอกสารเท่านั้น | `CLAUDE.md` §0 |
| Persona hash / autonomy dial ฝั่ง server | **`not implemented`** — มีแบบอย่างฝั่ง Android เท่านั้น | `apps/android/.../AutonomyDial.kt` |

เอกสารข้างเคียงที่พิมพ์เขียวนี้ตั้งใจ **อ้างอิง ไม่เขียนทับ**: `docs/agents/CLAUDE_TOOL_API_CONTRACT.md` (tool/API contract), `docs/COSPIN_DSG_RUNTIME_SPINE.md` (governance wrapper), `docs/PHASE2_PARALLEL_CONTROL_PLANE_DESIGN.md` (สเกล), `docs/MULTI_AGENT_COORDINATION.md` (multi-agent), `lib/dsg/brain/CREDENTIAL_BROKER.md` (ขอบเขต broker)

---

## 9. Roadmap + Verification plan

เรียงตามหลัก "smallest branchable change" — แต่ละ phase จบในตัว มี verification ของตัวเอง และไม่มี phase ไหน claim เกินหลักฐาน

### Phase A — Tool layer บน conformance gate (ปิด gap อันดับ 1)

- implement `fs.read` / `fs.write` / `fs.edit` / `search.glob` / `search.grep` เป็น module ใหม่ใต้ `lib/dsg/brain/` ตาม schema ใน §5 โดย reuse `canonicalizePath` ของ `conformance-gate.ts` และ evidence hashing ของ `hash-utils.ts`
- ทุก write tool คืน `ProposedFileChange` (type มีอยู่แล้วใน `controlled-executor.ts`) เพื่อเข้า conformance check ได้ทันที
- **Verify:** unit tests ใหม่ใน `tests/unit/` (mocked fs) + `npm run typecheck` + `npm run test:unit`

### Phase B — ต่อ LLM bridge เข้า planner

- ต่อ `hermes-llm.ts` เข้า `HermesPlugin.proposePlan()/remediatePlan()` แทน stub — output ต้อง freeze ผ่าน `buildPlanAttempt()` ก่อนคืนเสมอ
- **Verify:** unit tests (mocked LLM ตอบซ้ำได้) — assert ว่า plan เดียวกัน ⇒ planHash เดียวกัน และ plan ที่ mutate ⇒ `verifyPlanHash` fail ; ห้าม claim "live LLM integration" จนกว่าจะรันกับ key จริงใน environment ที่ configure แล้ว

### Phase C — Replay harness (T4 เป็นโค้ด)

- script ใหม่ใน `scripts/` : รับ run-id → โหลด T0 snapshot → re-execute pure stages → เทียบ output hash กับ baseline → exit non-zero เมื่อไม่ตรง
- **Verify:** รันสองครั้งบน snapshot เดียวกัน hash ต้องตรง; mutation test เล็ก ๆ ยืนยันว่า detect ความต่างได้

### Phase D — Persona + autonomy dial ฝั่ง server + ยืนยันตาราง DB

- encode `PersonaSpec` + `personaHash` (§6.1) และ autonomy dial (§6.2) เป็น type/module
- ยืนยันสถานะ live ของ `dsg_secrets` / `dsg_execution_grants` / `dsg_credential_leases` ด้วย query จริงผ่าน Supabase tooling ที่ได้รับอนุญาต แล้ว regenerate `lib/database.types.ts` (ตาม `CLAUDE.md` §6/§10) — จนกว่าจะทำ สถานะคง `not verified`
- **Verify:** `npm run typecheck` + query results แนบใน PR

### Phase E — Autonomous loop end-to-end (ระดับ bounded-auto)

- ผูก inbox → วงจร 6 ขั้น → commit → wakeup ตาม §6.3 บน cron ที่ fail closed ด้วย `CRON_SECRET`
- **Verify:** integration test ใน `tests/integration/` + audit trail query ยืนยันว่าทุก iteration มี evidence record ; go-live claim ใด ๆ ต้องผ่านเกณฑ์ `CLAUDE.md` §6 (production/deployment change) — ก่อนหน้านั้นสถานะคือ `NO-GO`

### Verification ของเอกสารฉบับนี้ (docs-only)

- [x] inspect ไฟล์ต้นทางทั้งหมดที่อ้างอิง (ผ่านการสำรวจ repo บน branch นี้)
- [x] JSON manifest ใน §5 ผ่าน `JSON.parse`
- [x] ไฟล์เป็น UTF-8 ถูกต้อง ไม่มี mojibake
- Runtime tests: **Not run — docs-only change**

---

*เอกสารนี้เป็น design blueprint — ไม่ใช่หลักฐานว่าระบบทำงานแล้ว ทุก claim สถานะในตาราง §8 อ้างอิงการ inspect ไฟล์จริง ณ วันที่จัดทำ และจะ drift ได้เมื่อ repo เปลี่ยน — ตรวจซ้ำก่อนใช้อ้างอิง*
