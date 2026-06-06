# Master Agent Loop — DSG ONE / ProofGate

> **สถานะเอกสาร:** การออกแบบสถาปัตยกรรม (design) — *ทางเลือกเพิ่มเติม* สำหรับเอเจนต์/ทีมในรีโพนี้
> **วันที่:** 2026-06-06
>
> **ขอบเขตความจริง (truth boundary):**
> - เอกสารนี้อธิบาย *รูปแบบลูป (loop pattern)* ของ agent โดย map แต่ละ stage เข้ากับ component ที่มีจริงในรีโพ (route / lib) เพื่อให้ implement ต่อได้ตรงของจริง
> - ชื่อไฟล์/route ที่อ้างถึงคือสิ่งที่ตรวจพบในโค้ด แต่เอกสารนี้ **ไม่ใช่** หลักฐานว่าทุก stage ถูกเดินครบใน production — เป็นพิมพ์เขียว ไม่ใช่ readiness claim
> - คงหลักการ governance-first ของรีโพ: **gate ก่อน execute, เก็บ evidence หลัง execute, `UNSUPPORTED`/ไม่พร้อม → review/block ไม่เคย auto-pass**

---

## 0. หลักการ (Philosophy)

Master Agent Loop คือวงจรควบคุมที่รับ "เป้าหมาย" แล้วเดินผ่าน plan → gate → execute → verify → learn จนกว่าจะถึงเงื่อนไขจบ โดย **ทุกการกระทำที่เปลี่ยนสถานะภายนอกต้องผ่าน gate ก่อน และต้องทิ้ง evidence ที่ตรวจสอบได้หลังทำ**

แตกต่างจาก agent loop ทั่วไปตรงที่ DSG ไม่ใช่ "คิดแล้วทำเลย" แต่เป็น **"คิด → เสนอแผนที่ล็อกด้วย hash → ตรวจก่อนทำ → ทำในกรอบที่อนุมัติ → พิสูจน์ว่าทำตรงแผน → บันทึก lineage"**

7 stage ตามที่ร้องขอ map ดังนี้:

| # | Stage (ไทย) | Stage (EN) | แกนหน้าที่ |
|---|---|---|---|
| 1 | รับเป้าหมาย | Receive Goal | intake + normalize intent |
| 2 | วิเคราะห์ | Analyze / Plan | สร้างแผน immutable + `planHash` |
| 3 | เลือก tool | Select Tool | เลือกเครื่องมือ + ผ่าน governance gate |
| 4 | รัน tool | Run Tool | execute ในกรอบ grant/lease + DSG gate |
| 5 | อ่านผล | Read Result | เก็บผลเป็น evidence + conformance check |
| 6 | ปรับ context | Adjust Context | อัปเดต memory / remediate / replan |
| 7 | ทำต่อจนจบ | Continue Until Done | loop control + commit lineage/audit |

---

## 1. แผนภาพลูป (Loop Diagram)

```
                 ┌──────────────────────────────────────────────┐
                 │                MASTER AGENT LOOP               │
                 └──────────────────────────────────────────────┘

   (1) Receive Goal ──▶ (2) Analyze/Plan ──▶ (3) Select Tool ──▶ (4) Run Tool
        intent.intake        planHash locked      governed gate        DSG gate
                                                  (ready/review/block) (ALLOW/STABILIZE/BLOCK)
                                                                            │
                                                                            ▼
                 ┌──────────────── (6) Adjust Context ◀── (5) Read Result ─┘
                 │                  memory + remediate     evidence + conformance
                 │                          │
                 ▼                          ▼
       (7) Continue Until Done  ──┐   replan? ──▶ back to (2)
        terminate / commit        │
        lineage + audit + truth   └──▶ next step ──▶ back to (3)
```

หลักการ flow:
- **gate อยู่ "ก่อน" execute เสมอ** (stage 3 governance gate, stage 4 DSG action gate)
- **verify อยู่ "หลัง" execute เสมอ** (stage 5 conformance + evidence)
- **violation → ไม่ commit** แต่เข้า remediation (stage 6) แล้ว replan (กลับ stage 2) หรือ block

---

## 2. รายละเอียดแต่ละ Stage

### Stage 1 — รับเป้าหมาย (Receive Goal)

**หน้าที่:** รับ intent จากภายนอก, ตรวจสิทธิ์/quota, normalize เป็น input ที่ deterministic

- **Entry points (verified):** `POST /api/intent`, `POST /api/spine/execute`, `POST /api/execute`
- **Auth/quota:** resolve agent จาก Bearer token + `agent_id` (`lib/agent-auth.ts`), เช็ค quota ก่อน (`lib/usage/quota.ts` → 402 เมื่อเกิน), เช็ค org/agent status active
- **Output:** `PlanAttemptInput` — `inputHash`, `attemptNo`, `policyVersion`, `invariantVersion`, `toolManifestHash` (ดู `lib/dsg/brain/plan-attempt.ts`)
- **Guardrail:** ถ้า quota เกิน / agent ไม่ active / token ผิด → หยุดที่ stage นี้ (fail closed) ไม่เข้าลูป

### Stage 2 — วิเคราะห์ (Analyze / Plan)

**หน้าที่:** แปลงเป้าหมายเป็นแผนปฏิบัติที่ **immutable และล็อกด้วย `planHash`**

- **Components:** `buildPlanAttempt(...)` → snapshot ที่ hash ได้ (`lib/dsg/brain/plan-attempt.ts`); LLM planning ผ่าน `generatePlanViaLLM(...)` (`lib/dsg/brain/hermes-llm.ts`) ซึ่งเลือก provider จาก env (`lib/dsg/brain/model-config.ts` → Anthropic หรือ NousResearch Hermes ผ่าน `hermes-nous-provider.ts`)
- **Output:** `HermesPlanProposal { plan, rationale, riskTags }` พร้อม `plan.planHash`
- **Truth boundary:** `proposePlan()` ใน `hermes-plugin.ts` ปัจจุบันเป็น scaffold ที่ build แผน deterministic — การเรียก LLM จริงอยู่ที่ `generatePlanViaLLM`; อย่าอ้างว่าเป็น autonomous planning เต็มรูปถ้าใช้ path scaffold
- **Guardrail:** ทุก step ในแผนต้องระบุ tool + เป้า path/command ที่จะใช้ เพื่อให้ stage 3/5 ตรวจได้; `planHash` ห้ามเปลี่ยนหลังอนุมัติ

### Stage 3 — เลือก tool (Select Tool)

**หน้าที่:** เลือกเครื่องมือสำหรับ step ปัจจุบัน แล้วผ่าน **governance gate ก่อน** ลงมือ

- **Components:** governed tool gate `prepareGovernedToolRequest(...)` (`lib/dsg/tools/governed-tools.ts`) → คืน `{ ok, status: 'ready'|'review'|'blocked', requestHash, audit }`
- **กติกา (verified pattern):**
  - write-class action (`create/update/delete/execute`) **ต้องมี evidence** มิฉะนั้น `blocked`
  - read-class action ที่ไม่มี evidence → `review` (ไม่ auto-pass)
  - whitelist: command ต้องอยู่ใน `allowedCommands`, path ต้องอยู่ใต้ `allowedPaths` (เตรียมที่ `buildControlledExecutionContext` ใน `controlled-executor.ts`)
- **Output:** tool ที่เลือก + execution grant/lease (`buildExecutionGrant`, credential lease จาก `credential-broker.ts` แบบ redacted)
- **Guardrail:** `status !== 'ready'` → ไม่เข้า stage 4 (เข้า review หรือ block); ไม่มี tool ที่อยู่นอก manifest

### Stage 4 — รัน tool (Run Tool)

**หน้าที่:** execute เครื่องมือ **ภายในกรอบที่อนุมัติ** โดยมี DSG action gate ตรวจอีกชั้นก่อนยิงจริง

- **Pre-exec gate (verified):** `evaluateAction(...)` (`lib/dsg/evaluate-action.ts`) → `ALLOW | STABILIZE | BLOCK` พร้อม `decisionHash`/`reasons`; **`BLOCK` → หยุด (เช่น 409)** ไม่ execute
- **Execution:** `executeCommand(cmd, ctx)` (`lib/dsg/brain/shell-executor.ts`) — มี blacklist คำสั่งอันตราย (`rm -rf`, `dd`, `mkfs`…), เช็ค grant ยังไม่หมดอายุ (TTL), timeout + max buffer
- **Worker abstraction:** `executeHermesPlan(...)` (`lib/hermes/runtime.ts`) เดิน step ผ่าน worker (terminal/file/browser/db/deploy/skill/subagent/research)
- **Guardrail:** secret ไม่เข้า context/log (credential lease redacted); ไม่มี production mutation นอก controlled execution

### Stage 5 — อ่านผล (Read Result)

**หน้าที่:** เก็บผลลัพธ์เป็น **evidence ที่ hash ได้** แล้ว **พิสูจน์ว่าทำตรงแผน**

- **Conformance (verified):** `checkConformance(ctx, result)` (`lib/dsg/brain/conformance-gate.ts`) ตรวจ:
  1. `planHash` ที่ทำจริงต้องตรงกับที่อนุมัติ
  2. ทุก command ที่รันต้องอยู่ใน `allowedCommands`
  3. ทุก path ที่เปลี่ยนต้องอยู่ใต้ `allowedPaths` (canonical)
  4. ต้องมี evidence (ไม่มี evidence = block)
- **Evidence:** ผลถูก hash เป็น SHA-256 lineage (`requestHash → decisionHash → recordHash → bundleHash`, ดู `lib/gateway/evidence-bundle.ts`)
- **Output:** `ConformanceReport { approved, planHash, violations[] }`
- **Guardrail:** `approved === false` → **ไม่ commit ผล**, ส่ง violations ไป stage 6

### Stage 6 — ปรับ context (Adjust Context)

**หน้าที่:** เรียนรู้จากผล/ความผิดพลาด แล้วปรับ "บริบท" ของลูปสำหรับรอบถัดไป

- **Memory (verified):** บันทึกบทสนทนา/ผลเป็น memory event (`persistAgentChatTurn`, `loadPersistentAgentMemory` ใน `lib/dsg/agent-runtime/persistent-chat-memory.ts`; repo/gate ที่ `lib/dsg/server/memory/*`)
  - **boundary สำคัญ:** memory เป็น *context ไม่ใช่ evidence* — ห้าม override user input ปัจจุบัน, verified evidence, database truth, permission gate, runtime observation
- **Remediation:** ถ้ามี violation → `remediatePlanViaNousHermes(...)` / remediation hook ใน `hermes-plugin.ts` สร้างแผนแก้ (กลับไป stage 2 ด้วย `attemptNo + 1`)
- **Context pack:** ประกอบ context ใหม่ (memory gate + ผลล่าสุด + เหตุผล gate) ป้อนเข้ารอบถัดไป
- **Guardrail:** unverified legal/production claim ใน memory ต้องถูก gate (ดู `evaluateMemoryGate`); ไม่นำ memory ที่ contains_secret เข้า context

### Stage 7 — ทำต่อจนจบ (Continue Until Done)

**หน้าที่:** ตัดสินใจว่า loop, replan, หรือ terminate — แล้ว **commit lineage/audit/truth**

- **Loop control:** ยังมี step เหลือ → กลับ stage 3; มี violation ที่แก้ได้ → replan (stage 2); จบ/ติด BLOCK → terminate
- **Termination conditions (ต้องกำหนดชัด):**
  - แผนครบทุก step + conformance approved → **success**
  - `BLOCK` ที่แก้ไม่ได้ หรือ evidence หาย → **halt (fail closed)**
  - เกิน `maxDepth`/`maxAttempts`/budget/quota → **halt with reason** (กัน loop ไม่รู้จบ)
- **Commit (verified path):** เขียน lineage/audit/truth ผ่าน runtime commit RPC (`runtime_commit_execution`); ถ้า error เรื่อง RPC/schema cache ให้ตาม `docs/RUNBOOK_DEPLOY.md` ไม่เดาแก้
- **Output:** decision, policyVersion, proof/proofHash, pipeline trace, ledger/truth sequence, usage

---

## 3. State Model (บริบทที่ถือข้ามรอบ)

ตัวแปร context ที่ลูปพกและ "ปรับ" ในแต่ละรอบ (stage 6):

```ts
type LoopState = {
  goal: string;                 // เป้าหมายต้นทาง (stage 1)
  inputHash: string;            // identity ของ intent
  plan: PlanAttempt;            // แผน immutable + planHash (stage 2)
  attemptNo: number;            // รอบ replan
  cursor: number;               // step index ปัจจุบัน
  allowedCommands: string[];    // whitelist (stage 3)
  allowedPaths: string[];       // whitelist (stage 3)
  grant: ExecutionGrant;        // TTL + renewals (stage 3/4)
  evidence: EvidenceRef[];      // สะสมจาก stage 5
  violations: Violation[];      // จาก conformance (stage 5)
  memoryContext: string;        // context pack (stage 6) — ไม่ใช่ evidence
  budget: { maxAttempts; maxDepth; quotaUsed }; // กัน loop ไม่จบ
  status: 'running'|'review'|'blocked'|'done'|'halted';
};
```

**กฎ:** `plan.planHash` เปลี่ยนได้เฉพาะตอน replan (สร้าง PlanAttempt ใหม่ + `attemptNo+1`) เท่านั้น; ระหว่าง execute หนึ่งแผน `planHash` ต้องคงที่

---

## 4. Pseudocode (state machine)

```text
state = receiveGoal(request)            # stage 1 (auth, quota, normalize)
if not state.admitted: return FAIL_CLOSED

loop:
  if state.cursor == 0 or state.needReplan:
    state.plan = analyze(state)         # stage 2 (planHash locked)

  tool = selectTool(state)              # stage 3
  gate = prepareGovernedToolRequest(tool)
  if gate.status != 'ready':
    state = adjustContext(state, gate)  # stage 6 (review/block path)
    if gate.status == 'blocked': break
    continue

  decision = evaluateAction(tool)       # stage 4 pre-exec DSG gate
  if decision == 'BLOCK': break
  result = runTool(tool, state.grant)   # stage 4 execute (whitelisted, TTL)

  report = checkConformance(state, result)  # stage 5 (planHash + paths + evidence)
  state.evidence += result.evidence

  if not report.approved:               # stage 6
    state = remediate(state, report.violations)
    if exceeded(state.budget): break
    continue

  state.memoryContext = updateMemory(state, result)  # stage 6

  if moreSteps(state): state.cursor += 1; continue    # stage 7 -> loop
  else: break

commitLineage(state)                    # stage 7 (runtime_commit_execution)
return summarize(state)                 # decision, proof, trace, usage
```

---

## 5. Safety & Termination Invariants

ค่าคงที่ที่ลูป **ต้อง** รักษา (สอดคล้อง CLAUDE.md):

1. **Gate-before-execute:** ไม่มี execute ใดเกิดก่อน governance gate (stage 3) + action gate (stage 4)
2. **Evidence-after-execute:** ทุก execute ต้องมี evidence; ไม่มี evidence → conformance block
3. **planHash integrity:** ผลที่ commit ต้องตรง `planHash` ที่อนุมัติ
4. **Whitelist only:** command/path นอก allowlist = violation
5. **`UNSUPPORTED`/ไม่พร้อม ≠ PASS:** map เป็น review/block เสมอ
6. **Fail closed:** auth/quota/secret/RPC ผิดพลาด → หยุด ไม่ใช่เดินต่อแบบ degrade เงียบ
7. **Bounded loop:** มี `maxAttempts/maxDepth/budget` กัน loop ไม่รู้จบ
8. **No raw secret in context/log:** ใช้ credential lease redacted เท่านั้น

---

## 6. Mapping Table (stage → ไฟล์จริงในรีโพ)

| Stage | Component (path) | บทบาท |
|---|---|---|
| 1 | `app/api/intent`, `app/api/spine/execute`, `lib/agent-auth.ts`, `lib/usage/quota.ts` | intake + auth + quota |
| 2 | `lib/dsg/brain/plan-attempt.ts`, `lib/dsg/brain/hermes-llm.ts`, `lib/dsg/brain/model-config.ts`, `lib/dsg/brain/hermes-nous-provider.ts` | plan + planHash + LLM |
| 3 | `lib/dsg/tools/governed-tools.ts`, `lib/dsg/brain/controlled-executor.ts`, `lib/dsg/brain/credential-broker.ts` | tool gate + grant/lease |
| 4 | `lib/dsg/evaluate-action.ts`, `lib/dsg/brain/shell-executor.ts`, `lib/hermes/runtime.ts` | action gate + execute |
| 5 | `lib/dsg/brain/conformance-gate.ts`, `lib/gateway/evidence-bundle.ts` | conformance + evidence hash |
| 6 | `lib/dsg/agent-runtime/persistent-chat-memory.ts`, `lib/dsg/server/memory/*`, `hermes-plugin.ts` (remediation) | memory + remediate/replan |
| 7 | runtime commit RPC `runtime_commit_execution`, `docs/RUNBOOK_DEPLOY.md` | lineage/audit/truth + recovery |

---

## 7. สิ่งที่ยังไม่ครอบคลุม (Next Steps)

- ตัวควบคุม budget/maxDepth กลางที่ใช้ร่วมทุก worker (ปัจจุบันกระจายอยู่หลายจุด)
- มาตรฐาน evidence schema เดียวข้ามทุก stage (รวม shell/file/browser/db worker)
- การ resume loop ที่ค้าง (checkpoint) จาก state ที่ commit ไว้
- ทดสอบ end-to-end ของลูปเต็ม 7 stage บน environment จริง (เอกสารนี้เป็นพิมพ์เขียว ยังไม่ใช่ proof ว่าเดินครบใน production)

> หมายเหตุ: เอกสารนี้เป็น design artifact ช่วยให้ implement/รีวิวลูปได้ตรงสถาปัตยกรรมจริง ไม่เปลี่ยนสถานะ production readiness และไม่ใช่หลักฐาน compliance
