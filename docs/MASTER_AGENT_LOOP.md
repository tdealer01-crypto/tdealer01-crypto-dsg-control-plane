# Master Agent Loop — DSG ONE / ProofGate

> **สถานะเอกสาร:** การออกแบบสถาปัตยกรรม (design) — *ทางเลือกเพิ่มเติม* สำหรับเอเจนต์/ทีมในรีโพนี้
> **วันที่:** 2026-06-06
>
> **ขอบเขตความจริง (truth boundary):**
> - เอกสารนี้อธิบาย *รูปแบบลูป (loop pattern)* ของ agent โดย map แต่ละ stage เข้ากับ component ที่มีจริงในรีโพ (route / lib) เพื่อให้ implement ต่อได้ตรงของจริง
> - ชื่อไฟล์/route ที่อ้างถึงคือสิ่งที่ตรวจพบในโค้ด แต่เอกสารนี้ **ไม่ใช่** หลักฐานว่าทุก stage ถูกเดินครบใน production — เป็นพิมพ์เขียว ไม่ใช่ readiness claim
> - คงหลักการ governance-first: **gate ก่อน execute, เก็บ evidence หลัง execute** แต่ใช้แบบ **ตามความเสี่ยง (risk-proportional)** เพื่อให้เร็วสุดเท่าที่ปลอดภัย

---

## 0. หลักการ (Philosophy)

Master Agent Loop รับ "เป้าหมาย" แล้วเดิน plan → gate → execute → verify → learn จนถึงเงื่อนไขจบ

**หลักสำคัญ (ปรับใหม่):** ประสิทธิภาพไม่ได้มาจากการ "ถอด gate" แต่มาจากการ **ไม่เอาความเข้มสูงสุดไปใช้เท่ากันทุก step** — ใช้ความเข้ม *ตามความเสี่ยงของ action* แล้วเพิ่ม parallel / batch / cache

- งาน **อ่าน/สังเกต ความเสี่ยงต่ำ** → วิ่ง **fast lane** (heuristic gate, ไม่เรียก LLM, audit เบา, auto-allow)
- งาน **เขียนที่ย้อนได้ ความเสี่ยงกลาง** → gate เต็มแต่ conformance เบา + เตรียม rollback
- งาน **ย้อนไม่ได้ / production / การเงิน ความเสี่ยงสูง** → gate เต็ม + STABILIZE/approval + conformance + evidence เต็ม

> สโลแกน: **"fast where safe, strict where it matters."** ความเร็วมาจาก fast lane + ขนาน + cache ไม่ใช่จากการลด "พื้นความปลอดภัยที่ห้ามลด" (§6)

7 stage ตามที่ร้องขอ map ดังนี้:

| # | Stage (ไทย) | Stage (EN) | แกนหน้าที่ |
|---|---|---|---|
| 1 | รับเป้าหมาย | Receive Goal | intake + normalize + จัด risk tier |
| 2 | วิเคราะห์ | Analyze / Plan | สร้างแผน (DAG) immutable + `planHash` |
| 3 | เลือก tool | Select Tool | routing ตามความเสี่ยง + gate |
| 4 | รัน tool | Run Tool | execute (ขนานได้) ในกรอบ grant/lease |
| 5 | อ่านผล | Read Result | evidence + conformance (เบา/เต็มตามชั้น) |
| 6 | ปรับ context | Adjust Context | memory / remediate / replan |
| 7 | ทำต่อจนจบ | Continue Until Done | loop control + commit lineage/audit |

---

## 1. แผนภาพลูป (Loop Diagram — risk-routed, parallel)

```
 (1) Receive Goal ─▶ (2) Analyze/Plan (DAG)
       risk tag           planHash locked
                               │
                               ▼
                   (3) Select Tool + ROUTE by risk
                      │                         │
        ┌─────────────┴──────────┐     ┌────────┴─────────────┐
        ▼  FAST LANE (read/low)   ▼     ▼  FULL LANE (write/high)
   heuristic gate, no-LLM      DSG gate ALLOW/STABILIZE/BLOCK
   auto-allow, light audit     (+approval if Tier 2)
        │                         │
        ▼                         ▼
   (4) Run Tool  ◀── parallel pool (independent steps run concurrently) ──▶ (4) Run Tool
        │                         │
        ▼                         ▼
   (5) light conformance     (5) full conformance + evidence
        └───────────┬─────────────┘
                    ▼
        (6) Adjust Context (memory / remediate)
                    │  violation? ─▶ replan ─▶ (2)
                    ▼
        (7) more steps ─▶ (3) | done ─▶ commit lineage/audit/truth
```

---

## 2. รายละเอียดแต่ละ Stage (เน้นจุดที่เพิ่มประสิทธิภาพ)

### Stage 1 — รับเป้าหมาย (Receive Goal)
- **Entry (verified):** `POST /api/intent`, `/api/spine/execute`, `/api/execute`; auth `lib/agent-auth.ts`; quota `lib/usage/quota.ts` (402 เมื่อเกิน)
- **เพิ่ม:** ติด **risk tier** ให้เป้าหมาย/แต่ละ step ตั้งแต่ต้น (read=0 / reversible-write=1 / irreversible|prod|finance=2) เพื่อใช้ route ใน stage 3
- **Output:** `PlanAttemptInput` (`lib/dsg/brain/plan-attempt.ts`)

### Stage 2 — วิเคราะห์ (Analyze / Plan)
- **Components:** `buildPlanAttempt` + `generatePlanViaLLM` (`hermes-llm.ts`, provider จาก `model-config.ts`)
- **เพิ่มประสิทธิภาพ:**
  - **วางแผนเป็น DAG** (ระบุ dependency) ไม่ใช่ลิสต์เชิงเส้น → step ที่ไม่ขึ้นต่อกันรันขนานได้ (stage 4)
  - **Batch planning:** วางหลาย step ครั้งเดียว ลดจำนวนการเรียก LLM
  - **Model tiering:** งานวางแผนง่าย/ความเสี่ยงต่ำใช้โมเดลเร็ว (Haiku) หรือ heuristic; เก็บโมเดลใหญ่ไว้กับงานซับซ้อน/เสี่ยงสูง
  - **Plan cache:** key ด้วย `inputHash` — เป้าหมายเดิม/เหมือนเดิม reuse แผนเดิม
- **Guardrail:** `planHash` ล็อกหลังอนุมัติ; ทุก step ระบุ tool + path/command ให้ stage 3/5 ตรวจได้

### Stage 3 — เลือก tool (Select Tool) + **Risk Routing**
- **Router:** ดู risk tier ของ step แล้วเลือกเลน
  - **Fast lane (Tier 0):** heuristic gate (whitelist + read-only check) **ไม่เรียก LLM/ไม่ replan** → auto-allow, audit เบา
  - **Full lane (Tier 1–2):** `prepareGovernedToolRequest(...)` (`lib/dsg/tools/governed-tools.ts`) → `ready|review|blocked`; Tier 2 ต้องผ่าน approval/STABILIZE เพิ่ม
- **Gate cache:** memoize ผล gate ด้วย `requestHash`/`decisionHash` — request เหมือนเดิม reuse ผล (ไม่ตัดสินซ้ำ)
- **กติกาคงเดิม:** write-class ต้องมี evidence; whitelist command/path (`controlled-executor.ts`)

### Stage 4 — รัน tool (Run Tool) — **Parallel**
- **Pre-exec gate:** `evaluateAction(...)` (`lib/dsg/evaluate-action.ts`) → `ALLOW|STABILIZE|BLOCK` (BLOCK หยุด)
- **Execute:** `executeCommand` (`shell-executor.ts`, blacklist+TTL) ผ่าน worker ใน `executeHermesPlan` (`lib/hermes/runtime.ts`)
- **เพิ่มประสิทธิภาพ:**
  - **Parallel pool:** step อิสระใน DAG รันพร้อมกัน (จำกัดด้วย `maxConcurrency`)
  - **Speculative + rollback:** action ที่ย้อนได้ (Tier 1) execute แบบ optimistic ขณะ conformance รัน async; commit เมื่อผ่าน, rollback เมื่อไม่ผ่าน — ไม่ block ลูปรอ commit ทุก step
- **Guardrail:** secret redacted (credential lease); ไม่มี production mutation นอก controlled execution

### Stage 5 — อ่านผล (Read Result) — **conformance ตามชั้น**
- **Conformance:** `checkConformance(...)` (`conformance-gate.ts`) — planHash ตรง, command/path ใน allowlist, มี evidence
- **เพิ่มประสิทธิภาพ:** **conformance เบาสำหรับ Tier 0** (เช็ค read-only + ไม่มี side-effect ก็พอ); **เต็มสำหรับ Tier 1–2** (planHash + path + evidence ครบ)
- **Evidence:** hash lineage `requestHash→decisionHash→recordHash→bundleHash` (`evidence-bundle.ts`); **dedup ด้วย contentHash** กันทำซ้ำ

### Stage 6 — ปรับ context (Adjust Context)
- **Memory:** `persistAgentChatTurn`/`loadPersistentAgentMemory` (`persistent-chat-memory.ts`) — *memory เป็น context ไม่ใช่ evidence*
- **เพิ่มประสิทธิภาพ:** เขียน memory/commit แบบ **async/batched** ไม่ block step ถัดไป; remediation เฉพาะ step ที่ fail (ไม่ replan ทั้งแผน)
- **Replan:** `remediatePlanViaNousHermes` / hook ใน `hermes-plugin.ts` (`attemptNo+1`)

### Stage 7 — ทำต่อจนจบ (Continue Until Done)
- **Loop control:** ยังมี node ที่ ready → ส่งเข้า pool (stage 3/4) ต่อ; จบ/BLOCK → terminate
- **Termination:** สำเร็จ / halt(fail closed) / เกิน `maxDepth·maxAttempts·budget·quota`
- **Commit:** lineage/audit/truth ผ่าน `runtime_commit_execution` (มีปัญหา RPC → ตาม `docs/RUNBOOK_DEPLOY.md`)

---

## 3. Autonomy Dial — ปรับระดับความเป็นอิสระ (กลไกหลักของ "เต็มประสิทธิภาพ")

ปุ่มหมุนเดียวที่กำหนดว่า agent หยุดถามมนุษย์เมื่อไร — ยิ่งสูงยิ่งเร็ว แต่ **พื้นความปลอดภัย §6 คงอยู่ทุกระดับ**

| ระดับ | พฤติกรรม | หยุดถามมนุษย์เมื่อ | เทียบของจริงในรีโพ |
|---|---|---|---|
| **L0 Manual** | อนุมัติทุก action | ทุก action | per-command approval |
| **L1 Work Session** | auto งาน Tier 0–1 | เจอ Tier 2 / สิทธิ์ใหม่ | Android "Work Session" |
| **L2 Supervised** | auto ถึง Tier 1, แจ้งแบบ async | เฉพาะ Tier 2 | — |
| **L3 Autonomous** | auto ทุกชั้นในกรอบ budget/policy | ไม่หยุด (policy gate แทนคน) | Android "Autonomous Mode" |

**สำคัญ:** L3 = ข้ามการ "ป๊อปอัปถามคน" เท่านั้น — **ไม่ข้าม** policy gate, evidence, audit, หรือพื้นความปลอดภัย (เหมือน Autonomous Mode ของ Android ที่ยังบันทึก audit ทุก step) ระดับสูงควรผูกกับ **budget cap** ที่เข้มขึ้น เพื่อให้ "เร็วและคุมได้"

---

## 4. State Model (รองรับ parallel + risk)

```ts
type LoopState = {
  goal: string;
  inputHash: string;
  plan: PlanDag;                 // DAG ของ step + dependency (stage 2)
  planHash: string;              // ล็อกต่อหนึ่งแผน
  attemptNo: number;
  frontier: StepId[];            // step ที่ ready (no pending deps) -> รันขนานได้
  riskTier: Map<StepId, 0|1|2>;  // ชั้นความเสี่ยงต่อ step (stage 1/3)
  grant: ExecutionGrant;         // TTL + renewals
  evidence: EvidenceRef[];
  violations: Violation[];
  memoryContext: string;         // context, ไม่ใช่ evidence
  autonomy: 0|1|2|3;             // Autonomy Dial (§3)
  budget: { maxAttempts; maxDepth; maxConcurrency; quotaUsed; deadline };
  caches: { plan; gate; evidence };
  status: 'running'|'review'|'blocked'|'done'|'halted';
};
```

---

## 5. Pseudocode (risk-routed, parallel, budget-bounded)

```text
state = receiveGoal(request)              # stage 1 (auth, quota, risk-tag)
if not state.admitted: return FAIL_CLOSED
state.plan = analyze(state)               # stage 2 (DAG, planHash locked)

while state.frontier not empty and within(budget):
  batch = take(state.frontier, state.budget.maxConcurrency)

  results = parallelMap(batch, step => {
    tier = state.riskTier[step]
    gate = (tier == 0)
              ? heuristicGate(step)        # stage 3 FAST LANE (no LLM)
              : cachedOr(prepareGovernedToolRequest, step)
    if gate.status != 'ready':
      if needsHuman(gate, state.autonomy): return PAUSE(step, gate)
      if gate.status == 'blocked': return BLOCKED(step)

    if tier >= 1 and evaluateAction(step) == 'BLOCK': return BLOCKED(step)
    out = runTool(step, state.grant)        # stage 4 (speculative if tier<=1)
    rep = checkConformance(state, out, level = tier==0 ? 'light' : 'full')  # stage 5
    return rep.approved ? OK(step, out) : VIOLATION(step, rep)
  })

  for r in results:                         # stage 6
    if r.ok: state.evidence += r.evidence; advanceDag(state, r.step)
    elif r.violation: state = remediate(state, r)   # replan only failed branch
    elif r.blocked: haltBranch(state, r.step)
    elif r.pause: awaitHuman(state, r)

  asyncCommit(state)                        # stage 6/7 non-blocking lineage write

return summarize(commitLineage(state))      # stage 7 (runtime_commit_execution)
```

---

## 6. พื้นความปลอดภัยที่ "ห้ามลด" (Non-negotiable Floor)

ต่อให้หมุน Autonomy Dial ไป L3 หรือเร่งความเร็วสุด ข้อเหล่านี้ **ห้ามปิด** (ตาม CLAUDE.md):

1. **Tier 2 ห้าม fast-lane** — action ย้อนไม่ได้ / production / การเงิน / ลบข้อมูล ต้องผ่าน full gate เสมอ
2. **Evidence-for-write** — write ต้องมี evidence; ไม่มี → block
3. **planHash integrity** — ผลที่ commit ต้องตรงแผนที่อนุมัติ
4. **Whitelist only** — command/path นอก allowlist = violation
5. **`UNSUPPORTED`/ไม่พร้อม ≠ PASS** → review/block เสมอ
6. **Fail closed** — auth/quota/secret/RPC ผิด → หยุด ไม่ degrade เงียบ
7. **Bounded** — มี budget/deadline/maxDepth เสมอ (กัน loop และ cost ระเบิด)
8. **No raw secret** ใน context/log — lease redacted เท่านั้น
9. **Audit always-on** — แม้ L3 ก็บันทึก audit/lineage ครบ

> เส้นแบ่ง: **ที่ปรับได้** = ความถี่ในการถามคน, การเรียก LLM, ความเข้มของ conformance สำหรับงานความเสี่ยงต่ำ, การขนาน/แคช · **ที่ปรับไม่ได้** = 9 ข้อข้างบน

---

## 7. Mapping Table (stage → ไฟล์จริงในรีโพ)

| Stage | Component (path) | บทบาท |
|---|---|---|
| 1 | `app/api/intent`, `app/api/spine/execute`, `lib/agent-auth.ts`, `lib/usage/quota.ts` | intake + auth + quota + risk-tag |
| 2 | `lib/dsg/brain/plan-attempt.ts`, `lib/dsg/brain/hermes-llm.ts`, `model-config.ts`, `hermes-nous-provider.ts` | plan(DAG) + planHash + model tiering |
| 3 | `lib/dsg/tools/governed-tools.ts`, `controlled-executor.ts`, `credential-broker.ts` | risk routing + gate + grant/lease |
| 4 | `lib/dsg/evaluate-action.ts`, `shell-executor.ts`, `lib/hermes/runtime.ts` | action gate + parallel execute |
| 5 | `lib/dsg/brain/conformance-gate.ts`, `lib/gateway/evidence-bundle.ts` | conformance(tiered) + evidence hash |
| 6 | `persistent-chat-memory.ts`, `lib/dsg/server/memory/*`, `hermes-plugin.ts` | memory + remediate/replan |
| 7 | `runtime_commit_execution` RPC, `docs/RUNBOOK_DEPLOY.md` | lineage/audit/truth + recovery |

---

## 8. สิ่งที่ยังไม่ครอบคลุม (Next Steps)

- ตัวจัดตาราง DAG + worker pool กลาง พร้อม `maxConcurrency`/deadline ที่ปรับได้ต่อ org
- นิยาม risk-tier policy ที่ตรวจสอบได้ (อะไรคือ Tier 2) แบบ config ไม่ใช่ hardcode
- กลไก rollback มาตรฐานสำหรับ speculative execution (Tier 1)
- ทดสอบ end-to-end ลูปเต็มทั้ง fast/full lane + parallel บน environment จริง (เอกสารนี้เป็นพิมพ์เขียว ยังไม่ใช่ proof ว่าเดินครบใน production)

> หมายเหตุ: เอกสารนี้เป็น design artifact ช่วยให้ implement/รีวิวลูปได้ตรงสถาปัตยกรรมจริง ไม่เปลี่ยนสถานะ production readiness และไม่ใช่หลักฐาน compliance
