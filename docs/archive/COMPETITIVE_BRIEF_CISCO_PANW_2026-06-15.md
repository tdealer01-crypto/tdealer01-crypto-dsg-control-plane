# Competitive Brief: DSG ONE / ProofGate vs. Cisco AI Defense & Palo Alto Networks Prisma AIRS

**วันที่จัดทำ:** 15 มิถุนายน 2026
**Scope:** AI agent governance / pre-action gating / AI security platforms
**แหล่งข้อมูล:** README ปัจจุบันของ `tdealer01-crypto-dsg-control-plane` (main branch) + ข่าวสาร/ประกาศผลิตภัณฑ์ของ Cisco และ Palo Alto Networks ถึงเดือนพฤษภาคม 2026

---

## 1. Competitor Overview

### DSG ONE / ProofGate (เรา)
- **สถานะ:** โปรเจกต์ pre-production, solo developer, deploy บน Vercel (`tdealer01-crypto-dsg-control-plane.vercel.app`)
- **Stack:** Next.js 15 / Supabase / Stripe billing hooks
- **Customer/traction:** 0 GitHub stars, 0 forks, 1 watcher, 622 commits, 5 open issues, 47 open PRs — ยังไม่มี case study หรือลูกค้าจริงที่ระบุไว้ในที่สาธารณะ
- **Category ที่ README ประกาศตัวเอง:** "runtime control plane for governed actions" — deterministic proof/gate scaffold สำหรับ AI/agent/workflow/finance/deployment actions

### Cisco AI Defense (built on Robust Intelligence)
- **บริษัทแม่:** Cisco (NASDAQ: CSCO) — ซื้อ Robust Intelligence ตุลาคม 2024 มูลค่าระดับ enterprise acquisition
- **Product:** AI Defense — algorithmic red teaming, AI Firewall, ผนวกเข้ากับ Cisco Security Cloud / Secure Access (SSE) / Splunk
- **Momentum ล่าสุด (RSA Conference 2026, มี.ค. 2026):** เปิดตัว "AI Defense: Explorer Edition" (self-serve red-teaming สำหรับ developer), agentic IAM ใน Duo, MCP policy enforcement ใน SSE, และ open-source agent framework "DefenseClaw"
- **Customer base (จาก Robust Intelligence เดิม):** อ้างอิงลูกค้าระดับ enterprise เช่น ADP, JPMorgan Chase, Expedia, Deloitte

### Palo Alto Networks Prisma AIRS 3.0
- **บริษัทแม่:** Palo Alto Networks (NASDAQ: PANW) — เข้าซื้อ Protect AI (ปิดดีลต้นปี 2026) และ Portkey (AI Gateway)
- **Product:** Prisma AIRS — แพลตฟอร์ม AI security ครบวงจร (apps, models, data, agents)
- **Momentum ล่าสุด (RSAC 2026, มี.ค. 2026):** เปิดตัว Prisma AIRS 3.0 — "Agent Security Platform" แนวคิด Discover → Assess → Protect, AI Agent Gateway (อยู่ใน limited preview) เป็น control plane สำหรับ agent runtime/identity/governance, รวม Portkey AI Gateway เข้ามาเป็น unified control plane (ประกาศ พ.ค. 2026)

---

## 2. Feature Comparison

| Capability Area | DSG ONE (ProofGate) | Cisco AI Defense | Prisma AIRS 3.0 |
|---|---|---|---|
| Deterministic pre-action gate (PASS/REVIEW/BLOCK ก่อน execute) | Adequate — มี API scaffold จริง (`/api/dsg/v1/gates/evaluate`), เป็น rule-based ไม่ใช่ external solver | Absent — โฟกัส red-team/runtime threat ไม่ใช่ deterministic policy gate ต่อ action | Limited — AI Agent Gateway ทำหน้าที่คล้ายกันแต่ยังอยู่ใน **limited preview** |
| Cryptographic evidence trail ต่อ action (request hash / decision hash / replay protection) | Adequate — มี nonce, idempotency key, hash fields ใน scaffold จริง | Limited — มี compliance reporting แต่ไม่ใช่โมเดล per-action hash แบบนี้ | Adequate — เน้น observability/governance แต่ไม่ระบุ hash chain ต่อ action |
| Formal/mathematical verification (Z3/SMT) | Weak — มี DOI/Zenodo อ้างอิง formal artifact แต่ในโค้ดจริง `externalSolverInvoked: false` | Absent | Absent |
| Runtime threat detection / red teaming / AI firewall | Absent | Strong — core IP จาก Robust Intelligence (algorithmic red teaming, Tree-of-Attacks) | Strong — AI Red Teaming, Runtime Firewall, ขยายรองรับ WebSocket targets (เม.ย. 2026) |
| Agent identity / RBAC | Weak — มี `agent-command-gate.ts` scaffold ในโค้ด แต่ยังไม่ deploy evidence | Strong — Zero Trust Access, agentic IAM ใน Duo | Strong — agentic identity ผ่าน AI Gateway/agent registry |
| Enterprise integration breadth | Weak — แผนรองรับ Zapier/Make/n8n/Workato/GitHub/Vercel แต่ยังตั้งค่าไม่ครบ (Bubble connector ยังขาด 6/7 API calls) | Strong — ผนวกเข้ากับ Cisco Security Cloud/SSE/Splunk ที่มี install base ใหญ่ | Strong — ผนวกเข้า Prisma platform + Portkey gateway |
| Production deployment maturity | Absent — README ของตัวเองยังระบุว่า go-live evidence ยังไม่ครบ | Strong — GA ตั้งแต่ มี.ค. 2025 | Strong — Prisma AIRS GA ตั้งแต่ เม.ย. 2025, เวอร์ชัน 3.0 มี.ค. 2026 |
| Independent validation / customer proof | Absent | Strong (ผ่าน RI legacy customers) | Strong (NASDAQ-listed, enterprise base) |

---

## 3. Positioning Analysis

**Cisco AI Defense** — Category: AI security platform ภายใน Security Cloud · Differentiator: red-teaming heritage + ผนวกกับ networking/identity stack เดิม · Value prop: "validate model อย่างต่อเนื่อง" ก่อนและหลัง deploy · Proof points: GA จริง, ลูกค้า enterprise จำนวนมาก

**Prisma AIRS 3.0** — Category: "Agent Security Platform" · Differentiator: ครอบคลุมทั้ง lifecycle (Discover/Assess/Protect) + AI Gateway เป็น control plane เดียว · Value prop: เปลี่ยนจาก "สังเกตการณ์ AI" ไปสู่ "อนุญาต autonomous execution อย่างปลอดภัย" · Proof points: บริษัท NASDAQ, การเปิดตัวใหญ่ที่ RSAC

**DSG ONE / ProofGate** — Category (ตาม README): "runtime control plane for governed actions" · Differentiator: deterministic + hash-based evidence ต่อ action เดียว, footprint เล็ก, onboarding แบบ "one system → one action → one evidence trail" · Value prop: ตรวจสอบ/บล็อก action ของ AI/agent ก่อนถึง production พร้อม evidence ที่ export ได้ · Proof points: **ยังอ่อน** — มี DOI/benchmark assets ที่ self-published แต่ยังไม่มี deployment evidence, customer, หรือ third-party validation ตามที่ README ของตัวเองระบุไว้ตรงๆ ใน "Deployment truth boundary" และ "Practical product boundary"

---

## 4. Strengths & Weaknesses

### DSG ONE
- **จุดแข็ง:** (1) เอกสาร claim-boundary ที่ตรงไปตรงมา — หาได้ยากในตลาดที่เต็มไปด้วย "AI safety" marketing เกินจริง; (2) กลไก deterministic hash-chain ต่อ action เป็นแนวทางที่ต่างจาก red-teaming/probabilistic scoring ของคู่แข่งทั้งสอง; (3) footprint เล็ก/onboarding เร็ว เหมาะกับทีมเล็กที่ไม่อยากซื้อ enterprise security platform
- **จุดอ่อน:** (1) ไม่มี production go-live evidence; (2) "formally verified" เป็น marketing framing ที่ยังไม่ตรงกับโค้ดจริง (`externalSolverInvoked: false`); (3) ไม่มีลูกค้า/community traction (0 stars); (4) integration surface ยังไม่สมบูรณ์ (Bubble connector 1/7 API call ตั้งค่าแล้ว)

### Cisco AI Defense
- **จุดแข็ง:** IP red-teaming เชิงลึกจาก Robust Intelligence, GA จริง, ผนวกกับ install base ด้าน networking/security ขนาดใหญ่
- **จุดอ่อน:** โฟกัสที่ threat/vulnerability detection มากกว่า deterministic pre-action policy gate แบบมี evidence hash; ต้องอยู่ใน ecosystem ของ Cisco

### Prisma AIRS 3.0
- **จุดแข็ง:** ครอบคลุม lifecycle ทั้งหมด, AI Gateway (จาก Portkey) เป็น control plane ที่ใกล้เคียงแนวคิด "gate" ของ DSG มากที่สุด, การกระจายสินค้าผ่าน enterprise sales ขนาดใหญ่
- **จุดอ่อน:** AI Agent Gateway — ส่วนที่เทียบเคียงกับ DSG ได้ตรงที่สุด — ยังเป็น **limited preview** ณ มี.ค. 2026; platform กว้างมากอาจไม่ลงลึกเรื่อง deterministic verification ต่อ action เดี่ยวๆ; ราคา/ความซับซ้อนระดับ enterprise ไม่เหมาะกับทีมเล็ก

---

## 5. Opportunities

1. **Niche ที่ยังไม่มีใครครอง:** นักพัฒนา/ทีมเล็กที่ใช้ AI coding agent (Claude Code, Cursor ฯลฯ) ต้องการ "เช็คก่อน action ว่าผ่านนโยบายไหม" แบบ deterministic, self-hostable, ไม่ต้องซื้อ enterprise platform — ตลาดนี้เล็กเกินไปสำหรับ Cisco/Palo Alto ในตอนนี้ และ AI Agent Gateway ของ Palo Alto ยังไม่ GA
2. **Deterministic-by-design เป็นจุดต่าง:** วาง positioning เป็นส่วนเสริม (complement) ของ red-teaming/firewall ไม่ใช่คู่แข่งตรง — "เราให้ evidence แบบ hash ที่ตรวจสอบซ้ำได้ ก่อน action จะถูก execute"
3. **EU AI Act compliance hooks** (ที่กำลังสำรวจอยู่) — บริษัทขนาดกลางที่ยังไม่พร้อมเซ็นสัญญา enterprise security platform อาจสนใจ evidence/audit trail ที่ตรวจสอบได้ ราคาถูกกว่า

---

## 6. Threats

1. **คู่แข่งใหญ่ทั้งสองกำลังเดินมาทางเดียวกัน:** Cisco มี MCP policy enforcement + agentic IAM ใน Duo, Palo Alto มี AI Agent Gateway — ทั้งสองคือพื้นที่ "gate ก่อน action" ที่ DSG ONE ยืนอยู่ ถ้าฟีเจอร์เหล่านี้ GA ภายใน 12-18 เดือน concept "gate ก่อน action" จะกลายเป็น commodity
2. **ความเสี่ยงด้านความน่าเชื่อถือ:** ถ้านักลงทุน/ลูกค้าตรวจโค้ดแล้วเจอช่องว่างระหว่าง claim ("formally verified") กับ implementation จริง (`externalSolverInvoked: false`) — เป็นความเสี่ยงที่ README ของโปรเจกต์เองก็เตือนไว้แล้ว
3. **Nightmare scenario:** ถ้า Palo Alto ปล่อย AI Agent Gateway เวอร์ชัน free/dev tier ออกจาก preview ก่อน DSG ONE จะมี go-live evidence — DSG ONE จะเสียข้อได้เปรียบเรื่อง "footprint เล็ก, onboarding เร็ว" ทันที

---

## 7. Strategic Implications (สิ่งที่ต้องทำต่อ)

1. **อย่าวาง DSG ONE ให้แข่งตรงกับ Cisco AI Defense / Prisma AIRS** ทั้งสองเป็นบริษัท NASDAQ ที่มี GA product และลูกค้า enterprise จริง — แข่งด้านความครอบคลุม/ความน่าเชื่อถือไม่ได้ในระยะนี้
2. **ปิด gap ระหว่าง claim กับ evidence ก่อนทำ external positioning push** — ตาม "user-benefit gate" และ truth boundary ของโปรเจกต์เอง: real Z3 integration, billing migration, go-live evidence คือสิ่งที่ทำให้ positioning ข้อ 1-2 ด้านบน "พูดได้จริง" ไม่ใช่แค่ "พูดได้สวย"
3. **Differentiator ที่ใช้ได้จริงตอนนี้:** deterministic hash-chain evidence ต่อ action + footprint เล็ก + เอกสาร honest-by-design — สื่อสารกับกลุ่มนักพัฒนา/ทีมเล็กที่ใช้ AI agent ก่อน ไม่ใช่ enterprise security buyer
4. **Monitor รายไตรมาส:** ความคืบหน้าของ Palo Alto AI Agent Gateway (ออกจาก preview เมื่อไร) และ Cisco MCP policy enforcement — สองตัวนี้คือ "ตัวชี้วัด" ว่าหน้าต่างโอกาสของ DSG ONE เหลือเวลาเท่าไร

---

## หมายเหตุเรื่องอายุข้อมูล (Shelf life)
ข้อมูลคู่แข่งอ้างอิง ณ มี.ค.-พ.ค. 2026 (RSAC 2026 launches) — พื้นที่นี้เปลี่ยนเร็ว ควร re-check ทุก 4-6 สัปดาห์ โดยเฉพาะสถานะ "limited preview" ของ Palo Alto AI Agent Gateway และความคืบหน้า MCP policy enforcement ของ Cisco
