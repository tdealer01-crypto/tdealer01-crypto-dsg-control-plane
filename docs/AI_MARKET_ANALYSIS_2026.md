# AI Market Analysis 2026 — DSG ONE / ProofGate Control Plane

> **สถานะเอกสาร:** กลยุทธ์การตลาด (strategy) — *ทางเลือกเพิ่มเติม* สำหรับเอเจนต์/ทีมที่ทำงานในรีโปนี้
> **วันที่:** 2026-06-05
> **ความสัมพันธ์กับเอกสารอื่น:** เสริม `GTM_STRATEGY.md` และ `docs/MARKET_STRATEGY_2026.md` โดยรวม 5 มิติ (ความต้องการตลาด → จุดที่ลูกค้าเห็น → วิธีเชื่อมต่อ → วิธีส่งมอบ → การตลาด) เข้าเป็นมุมมองเดียว พร้อม pitch outline ต่อ persona, ICP scoring และ pricing strategy
>
> **ขอบเขตความจริง (truth boundary) — สำคัญ:**
> - ความสามารถผลิตภัณฑ์ (route / auth / quota / pricing tier / evidence surface) = **verified จากโค้ดในรีโป**
> - ตัวเลข TAM / MRR / CAC / churn / conversion และเป้าหมาย = **projection / สมมติฐาน** ยังไม่มี traction ลูกค้าจริงรองรับ
> - สถานะ deploy ปัจจุบันที่อ้างได้ = `production-connected` **ไม่ใช่** `production-ready` / `certified` (ตามนโยบาย evidence-first ใน `CLAUDE.md`)
> - เอกสารนี้เป็น strategy artifact ไม่ใช่หลักฐาน compliance และไม่เปลี่ยนสถานะ readiness ใด ๆ

---

## 0. บทสรุปจุดยืน (Executive Positioning)

DSG ONE / ProofGate **ไม่ใช่ "แอป AI" แต่เป็นชั้นควบคุม (control plane)** ที่ขวาง action ของ AI agent *ก่อน* execution แล้วเก็บหลักฐาน/audit trail แบบ deterministic

- **One-liner (verified ใน `README.md`):** *"Block before the AI agent acts — not after the damage is done."*
- **แกนความแตกต่าง:** prevention *ก่อน* execution + deterministic proof — ต่างจากคู่แข่งกลุ่ม observability ที่ทำงาน *หลัง* action เกิดแล้ว
- **สินทรัพย์เชิงกลยุทธ์ที่หายากที่สุด:** "ความซื่อสัตย์ของ claim" — ทุก evidence ติด `certificationClaim=false` / `independentAuditClaim=false` ซึ่งกลายเป็นจุดขายในตลาด AI ที่เต็มไปด้วย hype

---

## 1. ความต้องการของตลาด (Market Demand)

### แรงผลักดัน 3 ชั้น
| แรงผลักดัน | ใครรู้สึก | งบ/ความเร่งด่วน | ระดับ verified |
|---|---|---|---|
| **Regulatory pull** (EU AI Act, ISO 42001, NIST AI RMF) | Enterprise / CISO / Compliance | งบสูง มี deadline จริง ($10K–50K+/เดือน) | ผลิตภัณฑ์มี evidence pack + Annex IV mapping จริง |
| **Operational fear** (agent ทำ action ผิด: double-spend, แก้โค้ดเอง) | ทีม deploy AI agent ใน production | incident-driven | gate/spine execution path จริง |
| **Audit fatigue** (เตรียม audit ด้วยมือ) | Finance / Ops | time-saving (ลด ~10 ชม./เดือน) | audit export + evidence chain จริง |

### ช่องว่างเชิงกลยุทธ์
- **Blue ocean จริง:** "pre-execution governance + deterministic proof" ยังไม่มีคู่แข่งตรงตัวที่รวมทั้งสองอย่าง
- **ความเสี่ยงคู่กัน — category creation cost:** ตลาดจำนวนมากยังไม่รู้ว่าตัวเองต้องการ "pre-execution gate" → ต้องลงทุน education ก่อนจะ harvest demand

> **Projection (ไม่ verified):** เอกสาร GTM ในรีโปประเมิน TAM ~560K บริษัท และเป้า MRR $50K–200K ใน 12 เดือน — ใช้เป็นสมมติฐานวางแผน ไม่ใช่ข้อเท็จจริงตลาด

---

## 2. จุดที่ลูกค้าเห็น (Customer Touchpoints)

Artifact ที่ลูกค้า "เห็นและแชร์ได้จริง" (verified ในโค้ด) คือจุดแข็งสูงสุด เพราะเปลี่ยนนามธรรม "governance" เป็นของจับต้องได้:

| Persona | สิ่งที่เห็น | เส้นทาง (verified) | ทำไมปิดการขายได้ |
|---|---|---|---|
| AI Agency | Delivery Proof Report (ลิงก์แชร์สาธารณะ) | `/delivery-proof/report/{run_id}` | เอาไปโชว์ลูกค้าปลายทางของ agency → white-label upsell |
| Procurement / CISO | Compliance Evidence Pack + EU AI Act Annex IV | `/api/compliance-evidence-pack`, `/api/compliance-evidence-pack/annex4` | ตอบ checklist จัดซื้อทันที ลดรอบขาย |
| Operator | Decision Explainer (ALLOW/STABILIZE/BLOCK + เหตุผลภาษาคน) | `/dashboard/executions` | เห็นคุณค่าทุกวัน → ลด churn |
| Board / Auditor | CCVS Evidence Chain + drift detection | `/api/ccvs/evidence-chain`, `/api/ccvs/compliance-status` | สร้างความเชื่อมั่นระดับกรรมการ |

### กลยุทธ์ Growth Loop
Touchpoint ถูกออกแบบให้ **แชร์ออกนอกองค์กรได้** (shareable report ID, public link). หนึ่งลูกค้าแชร์รายงาน = การตลาดฟรีถึงผู้มีอำนาจตัดสินใจรายถัดไป → ควรยกระดับเป็น **กลยุทธ์หลัก ไม่ใช่แค่ฟีเจอร์**

**ช่องว่าง:** Delivery Proof คือ hook ที่ทรงพลังสุดสำหรับ self-serve แต่ landing ปัจจุบันเน้น message "ควบคุม AI" — ควรดัน Delivery Proof เป็น top-of-funnel

---

## 3. วิธีเชื่อมต่อ (How to Connect)

### ความจริงทางเทคนิค (verified)
มี 279 routes แต่ลูกค้าเชื่อมต่อจริงผ่าน **3 จุดหลัก**:
1. `POST /api/agents` → ได้ API key `dsg_live_<uuid>` (โชว์ครั้งเดียว)
2. `POST /api/spine/execute` (alias: `POST /api/execute`) → ส่ง action ด้วย `Authorization: Bearer <key>` + `agent_id`
3. `POST /api/gateway/tools/execute` → governed action (เช่น Zapier connector)

Auth = Bearer token + SHA256 hash ของ agent key (resolve ใน `lib/agent-auth.ts`); quota เช็คก่อน execution คืน `402` เมื่อเกิน (`lib/usage/quota.ts`)

### คอขวดเชิงกลยุทธ์อันดับ 1
- เคลม *"Connect it in one line"* แต่ **ยังไม่มี SDK published บน npm/PyPI** (verified: ยังไม่ published) → "หนึ่งบรรทัด" ที่ไม่มี SDK = ลูกค้าต้องเขียน HTTP เอง = friction สูง
- `examples/managed-agent-session/` และ MCP bridge เป็น *example* ยังไม่ใช่ first-class onboarding
- `POST /api/dsg/v1/gates/evaluate` เป็น deterministic gate แบบ stateless (ไม่เรียก solver ภายนอก) → ขายเป็น **"gate SDK รันบน edge"** ได้ตรงกับ developer ที่ต้องการ latency ต่ำ

**คำสั่งเชิงกลยุทธ์:** *publish SDK + GitHub App ก่อนเร่งการตลาด* — การเชื่อมต่อที่ลื่นคือเงื่อนไขที่ทำให้ทุกช่องทางการตลาดแปลงเป็นลูกค้า

---

## 4. วิธีส่งมอบ (How to Deliver)

### กลไกส่งมอบ 3 ชั้น (verified)
- **Real-time:** ทุก execution คืน decision + proof hash + audit record (SHA-256 chain: `requestHash → decisionHash → recordHash → bundleHash`)
- **On-demand artifact:** Delivery Proof scan (5 เช็คจริง), Compliance Evidence Pack (HTML/PDF), Audit export (JSON/CSV + secret masking)
- **Continuous:** Dashboard (executions / audit / policies / capacity / billing) ต่อ Supabase จริง

### โมเดล Land-and-Expand
1. **Land:** Delivery Proof report (ฟรี/จ่ายครั้งเดียว) — friction ต่ำ ได้ผลลัพธ์เห็นภาพ
2. **Convert:** subscription (Trial → Pro → Agency/Business → Enterprise)
3. **Expand:** skill pack upsell ตาม persona

### ข้อต้องระวัง (truth boundary ในการส่งมอบ)
- **Stripe metered billing wired into execution path** (`meterExecution` called in `/api/spine/execute` line 347); requires Stripe meter env (`STRIPE_METER_EVENT_NAME`/meter id) to emit live meter events — ปัจจุบันใช้ quota รายเดือนแบบ flat tier → **อย่าขาย "usage-based billing active" ว่าส่ง meter events ถ้า env ยังไม่ตั้ง**
- หลักฐานทุกชิ้นติด `certificationClaim=false` / `independentAuditClaim=false` → ส่งมอบเป็น **"audit-ready / pre-audit evidence" ไม่ใช่ "certified"**
- "WORM" = DB hash chain ที่ตรวจสอบได้ ไม่ใช่ tamper-proof storage จริง (ไม่มี HSM/blockchain)

---

## 5. การตลาด (Marketing / GTM)

### เสาหลัก 3 เสา
**ก. Proof-led marketing (เสาหลัก):** ใช้ shareable Delivery Proof report เป็นเครื่องมือการตลาดในตัว + อ้างอิงความโปร่งใส (Z3 theorems, mutation score 72.08%, Zenodo DOI `10.5281/zenodo.18225586`) สร้าง credibility ผ่าน "ความจริงที่ตรวจสอบได้"

**ข. Segment-specific GTM (3 หัวหอก):**
- **Compliance-driven** (Enterprise/CISO): ขายผ่าน EU AI Act deadline — รอบยาว 4–8 สัปดาห์ deal ใหญ่ ใช้ Evidence Pack เป็นอาวุธ
- **Developer-led** (Dev teams): freemium + GitHub App + SDK → bottom-up (**ต้องมี SDK ก่อน** ดูข้อ 3)
- **Finance Ops quick-win** (CFO/Finance Mgr): รอบสั้น 2–4 สัปดาห์ ตัดสินใจเอง ขายด้วย "ลด audit prep ~10 ชม./เดือน" — **เป้าหมาย revenue เร็วที่สุด**

**ค. Positioning เชิงแข่งขัน:** ชู *"prevention ก่อน execution + deterministic proof"* vs observability หลัง action — message: *"คุณเห็นก่อน AI ลงมือ พร้อม audit trail ครบ"*

### ความเสี่ยงการตลาดที่ต้องบริหาร
1. Category education cost สูง (ตลาดยังไม่รู้จัก pre-execution governance)
2. **Claim discipline** — แบรนด์นี้ขาย "ความจริง" overclaim = ทำลายข้อได้เปรียบหลัก
3. ยังไม่มี pilot จริง → เร่ง 3 pilot แรกก่อนยิง paid marketing

---

## 6. Pitch Outline / One-pager ต่อ Persona

โครงร่างใช้ทำสไลด์/one-pager ได้ทันที (ปรับตัวเลขให้เป็น verified ก่อนส่งลูกค้าจริง)

### 6.1 Finance Ops (CFO / Finance Manager) — *quick-win*
1. **Hook:** "การอนุมัติจ่ายเงินผ่านอีเมล ไม่มี audit trail — ตอน audit คุณพิสูจน์ไม่ได้"
2. **Pain:** เตรียม audit ด้วยมือ ~10 ชม./เดือน; ความเสี่ยง double-spend จาก automation/agent
3. **Solution:** gate ทุกการจ่าย/อนุมัติก่อน execution + audit export (JSON/CSV) อัตโนมัติ
4. **Proof:** Decision Explainer + audit trail ที่ export ได้จริง (มี secret masking)
5. **Offer:** Skill pack Finance Governance ($199/เดือน) หรือ Pro/Business plan
6. **CTA:** pilot 14 วัน → ส่ง audit export ตัวอย่างจาก data จริงของลูกค้า

### 6.2 CISO / Compliance (Enterprise)
1. **Hook:** "EU AI Act บังคับหลักฐานควบคุม AI ที่ตรวจสอบได้ — คุณมีหรือยัง?"
2. **Pain:** ต้องพิสูจน์ governance ของ AI agent ต่อ regulator/board; observability tools เห็นปัญหา *หลัง* เกิด
3. **Solution:** pre-execution gate + deterministic evidence chain + Annex IV mapping
4. **Proof:** Compliance Evidence Pack, CCVS evidence chain (L1–L5), Z3 theorems — **พร้อม disclaimer pre-audit ชัดเจน**
5. **Offer:** Enterprise ($999+/เดือน) + SSO/RBAC + SLA
6. **CTA:** evidence pack review session กับทีม compliance
> **ห้าม overclaim:** ใช้คำว่า "audit-ready / pre-audit evidence mapping" — ไม่ใช่ "certified / third-party audited"

### 6.3 Dev Team (Eng Manager / CTO) — *developer-led*
1. **Hook:** "AI agent แก้โค้ด/สั่ง action ก่อนคุณเห็น — คุณ rollback ทันไหม?"
2. **Pain:** agent (Claude Code, OpenHands, Aider ฯลฯ) ทำ action โดยไม่มี guardrail
3. **Solution:** deterministic gate SDK (stateless, รัน edge, ไม่ต้องมี solver ภายนอก) + audit trail
4. **Proof:** `POST /api/dsg/v1/gates/evaluate` live + decision/proof hash + pipeline trace
5. **Offer:** freemium (X gates/เดือนฟรี) → Pro $99 → Enterprise
6. **CTA:** ติดตั้ง SDK/GitHub App แล้วเห็น gate decision แรกใน <10 นาที
> **Dependency:** ต้อง publish SDK + GitHub App ก่อน pitch นี้จะ convert ได้จริง

---

## 7. ICP Scoring Model (คัดบริษัทเป้าหมาย)

ให้คะแนนแต่ละ lead 0–100 เพื่อจัดลำดับ outreach. รวม 5 ปัจจัย ถ่วงน้ำหนัก:

| ปัจจัย | น้ำหนัก | เกณฑ์ให้คะแนนสูง |
|---|---|---|
| **Regulatory exposure** | 25% | อยู่ในขอบเขต EU AI Act / regulated (finance, health, public) |
| **AI agent in production** | 25% | deploy agent ที่ทำ action จริง (ไม่ใช่แค่ chatbot) |
| **Pain urgency** | 20% | มี incident / audit deadline / mandate จาก board |
| **Budget & buyer access** | 15% | เข้าถึง economic buyer (CFO/CISO/CTO) + งบ >$99/เดือน |
| **Time-to-decision** | 15% | รอบตัดสินใจสั้น (Finance Ops 2–4 wk = สูง; Enterprise 4–8 wk = กลาง) |

**การแปลผล (เกณฑ์เริ่มต้น ปรับได้):**
- **80–100 = Tier 1 (Hot):** outreach ทันที, offer pilot
- **60–79 = Tier 2 (Warm):** nurture ด้วย content/evidence pack
- **<60 = Tier 3 (Cold):** เก็บไว้ใน community/education funnel

**Quick-win profile (คะแนนสูงสุดคาดการณ์):** บริษัท 50–500 คน, Finance Ops, มี automation จ่ายเงิน, CFO เข้าถึงได้, รอบสั้น
> เชื่อมต่อกับ `docs/TARGET_COMPANIES.md` ที่มี template วิจัยบริษัทอยู่แล้ว — ใช้ scoring นี้ scoring รายชื่อในนั้น

---

## 8. Pricing Strategy (เจาะลึก)

### 8.1 Tier ปัจจุบัน (verified ในโค้ด/หน้า pricing)
| Plan | ราคา | Quota (executions/เดือน) |
|---|---|---|
| Trial | ฟรี (14 วัน full) | 1,000 |
| Pro | $99/เดือน ($79 รายปี) | 10,000 |
| Agency / Business | $299/เดือน ($249 รายปี) | 100,000 |
| Enterprise | $999/เดือน (custom) | custom (~1,000,000) |

Skill packs (upsell): Finance $199 · Dev Automation $99 · Compliance $249 · Operations $149 · Enterprise Bundle $599

### 8.2 กลยุทธ์ Land-and-Expand
- **Land:** Trial / Delivery Proof report (one-time/free) — ลด friction เข้าให้มากที่สุด
- **Expand vertical:** Pro → Business → Enterprise ตาม volume executions (quota เป็นแกนธรรมชาติของ expansion)
- **Expand horizontal:** skill pack ตาม use case (Finance, Compliance) — เพิ่ม ARPU โดยไม่ต้องหา logo ใหม่
- **Retention hook:** audit export + evidence history สร้าง lock-in (ลูกค้าไม่อยากเสียประวัติหลักฐาน)

### 8.3 ลำดับงานก่อนขาย pricing ขั้นสูง
- **configure Stripe meter env** (`STRIPE_METER_EVENT_NAME`, meter id) ก่อนโฆษณา usage-based overage live (ตอนนี้ flat tier; code wired แต่ยังต้อง env + meter คอนฟิก)
- ตรวจสอบ entitlement (`lib/billing/entitlements.ts`) ให้ map ตรงกับหน้า pricing ที่โฆษณา ก่อน launch แคมเปญ

---

## 9. ลำดับความสำคัญเชิงกลยุทธ์ (Action Priorities)

1. **ปลดคอขวดการเชื่อมต่อ:** publish SDK + GitHub App (เงื่อนไขให้ทุกช่องทางแปลงเป็นลูกค้า)
2. **ล่า quick-win:** เจาะ Finance Ops ($199–999/เดือน รอบสั้น) เพื่อ revenue + case study แรก
3. **ขยาย growth loop:** ทำ Delivery Proof report ให้แชร์ลื่นที่สุด = การตลาดทบต้น
4. **รักษาเส้น claim:** ทุก asset ใช้ `production-connected / audit-ready / pre-audit` ไม่ใช่ `certified / production-ready`
5. **configure Stripe meter env + test meter events** ก่อนโฆษณา usage-based billing live

---

## 10. หมายเหตุความถูกต้อง (Verification Note)

- **Verified จากโค้ด:** routes (`/api/agents`, `/api/spine/execute`, `/api/gateway/tools/execute`, `/api/dsg/v1/gates/evaluate`, `/api/delivery-proof/scan`, `/api/compliance-evidence-pack*`, `/api/ccvs/*`), Bearer auth + SHA256 (`lib/agent-auth.ts`), quota (`lib/usage/quota.ts`), pricing tiers (`lib/stripe-products.ts` / หน้า pricing), evidence surfaces (`lib/ccvs/*`, `lib/gateway/evidence-bundle.ts`), metering call (`meterExecution` in `/api/spine/execute` line 347)
- **Projection / สมมติฐาน:** TAM, MRR/ARR, CAC, churn, conversion, เป้าหมายลูกค้า, ICP score thresholds — ยังไม่มี traction จริงรองรับ
- **ยังไม่ verified / ยังไม่พร้อม:** SDK บน npm/PyPI (ยังไม่ published), Stripe meter env + live meter emission (code wired, env not yet configured), pilot ลูกค้าจริง (ยังไม่มี), third-party certification/audit (ไม่มี)

> เอกสารนี้เป็น strategy artifact เพื่อช่วยตัดสินใจ ไม่เปลี่ยนสถานะ production readiness และไม่ใช่หลักฐาน compliance
