# DSG ONE — Market Strategy & Revenue Plan 2026

> วิเคราะห์จาก codebase จริง + ข้อมูลตลาด — ไม่ใช่สมมติ

---

## 1. สินค้าที่มีอยู่จริง (What We Actually Have)

| ชั้น | สิ่งที่ build แล้ว | สถานะ |
|---|---|---|
| **Core gate engine** | Deterministic proof/gate — PASS/BLOCK/REVIEW พร้อม evidence hash | ✅ Production |
| **Finance governance** | Approval queue, case detail, audit ledger, exception posture | ✅ Production |
| **Agent command gate** | Pre-action RBAC + idempotency + rollback plan | ✅ Production |
| **Integration gateway** | REST, Webhook, Zapier/Make/n8n bridge | ✅ Production |
| **GitHub Action** | Release gate `dsg-secure-deploy-gate-action@v1.0.2` | ✅ Marketplace |
| **Evidence pack** | Export proof trail + hash chain สำหรับ audit | ✅ Production |
| **Billing** | Stripe: Pro $99 / Business $299 / Enterprise $999 | ✅ Live |

**จุดแข็งที่ตลาดยังไม่มี:** ระบบเดียวที่เชื่อม AI agent + finance approval + deployment gate ในหน้าเดียว พร้อม audit-ready evidence ออกมาเป็นไฟล์ได้เลย

---

## 2. วิเคราะห์ตลาด

### 2.1 ลูกค้าที่จ่ายได้จริงตอนนี้ (ICP — Ideal Customer Profile)

#### กลุ่ม A: Finance Ops ในบริษัท Mid-Market (Quick Win)
- **ใคร:** CFO, Finance Manager, AP/AR lead ในบริษัท 50–500 คน
- **ปัญหา:** อนุมัติจ่ายเงินผ่าน email → ไม่มี audit trail → โดน auditor ถาม
- **วิธีทำอยู่ตอนนี้:** Excel + email + sign paper
- **ยินดีจ่าย:** $299–$999/เดือน ถ้าลด audit prep ได้ 10 ชม./เดือน
- **ตัดสินใจ:** Finance Manager ตัดสินใจได้เอง ไม่ต้องรอ IT
- **Timeline:** ปิดดีลได้ใน 2–4 สัปดาห์

#### กลุ่ม B: AI Product Teams (Growth)
- **ใคร:** CTO/Head of Engineering ที่ deploy AI agents ใน production
- **ปัญหา:** AI actions ไม่มี guard rail → double-spend / unauthorized action → incident
- **วิธีทำอยู่ตอนนี้:** custom middleware + manual review
- **ยินดีจ่าย:** $999/เดือน + setup fee ถ้าลด incident ได้
- **ตัดสินใจ:** CTO + Security ต้องเห็นด้วยกัน → ใช้เวลา 4–8 สัปดาห์
- **Timeline:** 1–3 เดือน

#### กลุ่ม C: DevOps/Release Engineering (Viral Channel)
- **ใคร:** DevOps engineer, platform team
- **ปัญหา:** Deploy ผิด environment → incident → blame game
- **วิธีทำอยู่ตอนนี้:** GitHub Actions + manual checklist
- **ยินดีจ่าย:** เริ่มจาก GitHub Action ฟรี → upgrade Pro $99
- **Timeline:** ใช้ฟรีก่อน → upgrade เมื่อต้องการ audit log

#### กลุ่ม D: Consultant/Auditor (Multiplier)
- **ใคร:** Big4, boutique IT audit firm, compliance consultant
- **ปัญหา:** ลูกค้า (corporate) ถามหา proof of controls → ต้องสร้าง report เอง
- **วิธีทำอยู่ตอนนี้:** Word/Excel report + screenshot
- **ยินดีจ่าย:** Reseller margin 20–30% หรือ white-label
- **Multiplier effect:** 1 consultant นำไปใช้กับลูกค้า 5–20 บริษัท

### 2.2 ตลาดที่แข่งกัน

| คู่แข่ง | จุดแข็งเขา | ช่องว่างที่ DSG ONE เข้าได้ |
|---|---|---|
| ServiceNow / Workday | ครบ, enterprise-grade | แพง $100k+/ปี, ใช้ยาก, ไม่มี AI agent gate |
| Zapier / Make | ง่าย, popular | ไม่มี governance layer, ไม่มี audit proof |
| LaunchDarkly / Harness | เก่ง deployment gate | เฉพาะ deploy ไม่ครอบ finance+AI |
| Custom middleware | flexible | ต้อง build เอง, ไม่มี evidence format |
| **DSG ONE** | **ครบ 3 domain (AI+Finance+Deploy) + proof** | — |

**Blue ocean:** ไม่มีใครทำ runtime governance แบบ "3-in-1 + deterministic proof" ราคา mid-market

---

## 3. แผนรายได้ 12 เดือน

### 3.1 Revenue Model

```
Primary:   SaaS subscription (MRR)
Secondary: One-time readiness report ($9 → entry funnel)
Future:    Usage overage fees (executions > plan limit)
Partner:   Reseller/white-label margin (consultant channel)
```

### 3.2 Target MRR Milestones

| เดือน | Target MRR | Customer Mix | Key Action |
|---|---|---|---|
| M1–M2 | $3,000 | 3 × Pro ($99) + 1 × Business ($299) | ปิด pilot 4 บริษัท |
| M3–M4 | $8,000 | +5 Business + 1 Enterprise | case study แรกออก |
| M5–M6 | $15,000 | 15 Business + 2 Enterprise | inbound จาก case study |
| M7–M9 | $30,000 | 30 customers mixed | consultant channel เปิด |
| M10–M12 | $50,000 | 50 customers, 10% Enterprise | ARR $600k |

**เป้า Year 1 ARR: $400k–600k** (conservative-realistic, ไม่ใช่ hockey stick)

### 3.3 Unit Economics

| Plan | MRR/customer | CAC target | Payback |
|---|---|---|---|
| Pro $99 | $99 | <$300 | 3 เดือน |
| Business $299 | $299 | <$900 | 3 เดือน |
| Enterprise $999 | $999 | <$5,000 | 5 เดือน |

**Churn assumption:** <5%/เดือน ถ้า audit export ถูกใช้งาน (lock-in)

---

## 4. ผลิตภัณฑ์ที่ต้องสร้างเพิ่ม (เรียงตาม ROI)

### Priority 1 — ทำทันที (Revenue Unblock)

#### 4.1 "Finance Approval Starter Pack"
**ปัญหาที่แก้:** CFO/Finance Manager ต้องการระบบอนุมัติที่ใช้ได้ใน 1 วัน
**Feature set:**
- Template approval workflow สำเร็จรูป (Invoice / Payment / Vendor onboarding)
- Email notification เมื่อมีรายการรออนุมัติ (ตอนนี้ไม่มี)
- PDF export ใบอนุมัติพร้อม hash + timestamp
- ไม่ต้อง setup อะไรเลย — กรอก vendor, amount, กด submit → มี trail

**Integration:** ต่อกับ QuickBooks / Xero ผ่าน Zapier bridge (ใช้ gateway ที่มีอยู่)
**Pricing:** รวมใน Business plan $299

#### 4.2 "One-Click Audit Report"
**ปัญหาที่แก้:** ถึงเวลา audit → ต้องรวบรวม evidence ภายใน 1 ชม.
**Feature set:**
- กด button → ได้ PDF report พร้อม: action log, approval chain, hash trail, timestamps
- Filter by date range, type, status
- Watermark + org logo
- ส่งได้เลยให้ auditor

**ทำจาก:** evidence pack ที่มีอยู่แล้ว → เพิ่มแค่ PDF renderer
**Pricing:** Free สำหรับ Business+, $29/report สำหรับ Pro

### Priority 2 — ทำใน Q3 (Expansion Revenue)

#### 4.3 "Agent Governance Dashboard"
**ปัญหาที่แก้:** CTO ต้องการเห็นว่า AI agent ทำอะไรบ้าง real-time
**Feature set:**
- Live feed ของ agent actions พร้อม PASS/BLOCK status
- Alert เมื่อ agent ถูก BLOCK บ่อยผิดปกติ
- Cost per action tracking (agent spending)
- Rollback button ถ้า action ไม่ถูกต้อง

**ทำจาก:** `/dashboard/executions` + agent-command-gate → เพิ่ม visualization
**Pricing:** Enterprise only $999

#### 4.4 "Integration Marketplace — ต่อกับระบบเดิมลูกค้า"
**ปัญหาที่แก้:** ลูกค้ามีระบบเดิมอยู่แล้ว ไม่อยาก migrate
**One-click connectors:**
| ระบบ | วิธีต่อ | ใช้เวลา setup |
|---|---|---|
| Slack | Webhook → receive approval action | 5 นาที |
| Microsoft Teams | Adaptive card → approve button | 10 นาที |
| QuickBooks Online | OAuth → sync invoice status | 15 นาที |
| Xero | OAuth → sync payment status | 15 นาที |
| SAP (via REST) | API key → governance wrapper | 1 ชม. |
| Jira | Webhook → gate before deploy | 5 นาที |

**ทำจาก:** gateway connectors ที่มีอยู่ + OAuth flows ใหม่
**Pricing:** ใน Business plan, SAP/enterprise connectors = Enterprise only

### Priority 3 — ทำใน Q4 (Moat Building)

#### 4.5 "Compliance Evidence Vault"
**ปัญหาที่แก้:** ลูกค้าต้องการเก็บ evidence ครบ 7 ปีสำหรับ compliance
**Feature set:**
- Immutable audit log (append-only, hash-chained)
- Export ตาม standard: SOC 2, ISO 27001 format
- Data retention policy configurable
- Role-based access: auditor read-only

**Pricing:** Add-on $199/เดือน หรือรวมใน Enterprise

#### 4.6 "White-Label สำหรับ Consultant"
**ปัญหาที่แก้:** Consultant อยากเอาไปขายลูกค้าในชื่อตัวเอง
**Feature set:**
- Custom domain (governance.clientfirm.com)
- Logo + color scheme
- Reseller dashboard (ดูลูกค้าทั้งหมดในที่เดียว)
- Margin: consultant ซื้อ $599 ขาย $999+ ได้

**Pricing:** Partner tier $599/เดือน + setup fee $1,500

---

## 5. Go-to-Market Plan

### 5.1 เดือนแรก — Pilot 5 บริษัท

**เป้า:** ไม่ใช่ revenue — เป็น proof of value

**Playbook:**
1. หา 5 CFO/Finance Manager ที่รู้จักส่วนตัว
2. ให้ใช้ฟรี 30 วัน — setup approval workflow 1 อัน
3. วัดผล: จำนวน approval ที่ผ่าน + เวลาที่ประหยัด
4. ขอ testimonial + เขียน case study
5. ใช้ case study ปิด deal ถัดไป

**ไม่ควรขาย:** cold outreach โดยไม่มี case study ก่อน

### 5.2 เดือน 2–4 — Inbound Engine

**Content ที่สร้าง value จริง:**
- "Finance Approval Audit Checklist" (PDF ฟรี → email capture)
- "5 AI Agent Incidents ที่เกิดขึ้นจริง" (blog/LinkedIn)
- Demo video: "Setup governed invoice approval ใน 10 นาที"

**Channel:**
- LinkedIn (Finance/CFO audience) — organic + paid
- GitHub Marketplace (DevOps audience) — free action เป็น funnel
- Reddit r/devops, r/Accounting — answer questions genuinely

### 5.3 เดือน 5–12 — Consultant Channel

**Partnership tier:**
- Referral: 20% MRR แรก 12 เดือน
- Reseller: ซื้อ seat ราคา cost + ขายต่อเองได้
- White-label: ตาม section 4.6

---

## 6. ความได้เปรียบที่ผสมกับระบบเดิมลูกค้า (Integration Ease)

### หลักการ: ไม่บังคับ migrate, ต่อแบบ overlay

```
ระบบเดิมลูกค้า (QuickBooks / SAP / Jira / Custom)
         ↓
   DSG ONE Gateway (Webhook / REST bridge)
         ↓
   Governance layer (approve / block / evidence)
         ↓
   กลับไปยังระบบเดิม (callback / webhook response)
```

**ลูกค้าไม่ต้อง:**
- เปลี่ยน database
- เปลี่ยน workflow เดิม
- Train ทีมใหม่ทั้งหมด

**ลูกค้าแค่ต้อง:**
- Register webhook URL ของ DSG ONE ใน system เดิม
- Copy API key จาก dashboard
- เปิด DSG ONE tab เมื่อต้อง approve

### Integration Time-to-Value

| Use Case | Setup Time | ต้องการ IT | ได้ value ใน |
|---|---|---|---|
| Finance approval (email trigger) | 30 นาที | ไม่ต้อง | วันเดียวกัน |
| Slack approval notification | 10 นาที | ไม่ต้อง | วันเดียวกัน |
| GitHub release gate | 5 นาที | ไม่ต้อง | commit แรก |
| QuickBooks sync | 1 ชม. | น้อยมาก | สัปดาห์เดียวกัน |
| AI agent wrapper | 2–4 ชม. | ต้องการ dev | sprint เดียวกัน |
| SAP governance layer | 1 วัน | IT + dev | เดือนเดียวกัน |

---

## 7. สรุป Priority Actions (เรียงตามผลกระทบ)

| # | Action | ใครทำ | เวลา | Impact |
|---|---|---|---|---|
| 1 | Email notification เมื่อมีรายการรออนุมัติ | Dev | 2 วัน | Unblock finance customers |
| 2 | PDF export approval record | Dev | 3 วัน | Close enterprise deals faster |
| 3 | Pilot 5 บริษัท ฟรี 30 วัน | Founder | ทันที | Get first case study |
| 4 | Slack connector (webhook) | Dev | 3 วัน | Reduce setup friction |
| 5 | QuickBooks OAuth integration | Dev | 1 สัปดาห์ | Finance segment adoption |
| 6 | Case study content | Founder/Marketing | 2 สัปดาห์ | Inbound engine |
| 7 | Consultant partner program | Founder | 1 เดือน | Revenue multiplier |
| 8 | Compliance evidence vault | Dev | 1 เดือน | Enterprise upsell |

---

*วิเคราะห์จาก codebase ณ 2026-05-15 — ไม่รวมข้อมูลที่ยังไม่ได้ build*
