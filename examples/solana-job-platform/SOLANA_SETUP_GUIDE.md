# Solana Job Platform — Setup Guide

AI Agent ที่ค้นหางาน, รับงาน, ส่งมอบงาน, และรับเงินบน Solana อัตโนมัติ

> **สถานะ:** Simulated mode — payment settlement เป็นการจำลอง
> ต้อง integrate `@solana/web3.js` ก่อนใช้งานจริงบน mainnet

---

## Prerequisites

- Node.js 18+
- npm 9+
- (Optional) Solana CLI สำหรับ wallet management

---

## Quick Start

```bash
cd examples/solana-job-platform

# Auto-setup (recommended)
chmod +x quickstart.sh
./quickstart.sh

# หรือ manual
npm install
npm run dev
```

---

## Configuration

### Environment Variables

สร้างไฟล์ `.env` (quickstart.sh สร้างให้อัตโนมัติ):

```env
# Solana RPC
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Agent
AGENT_ID=agent-main

# Platform API keys (optional — simulated mode ไม่ต้องใช้)
# GITHUB_TOKEN=ghp_...
# IMMUNEFI_API_KEY=...
# HACKERONE_API_TOKEN=...
```

### Platform API Keys

| Platform | API Key | จำเป็น? |
|----------|---------|---------|
| GitHub Bounties | `GITHUB_TOKEN` | Optional |
| Solana Bounties | — | ไม่ต้อง (public API) |
| Immunefi | `IMMUNEFI_API_KEY` | Optional |
| HackerOne | `HACKERONE_API_TOKEN` | Optional |
| Upwork | OAuth flow | Optional |
| DSG Internal | `DSG_API_KEY` | Optional |

ใน simulated mode ไม่ต้องมี API key จริง — agent จะใช้ข้อมูลจำลอง

---

## Running Modes

### Single Cycle

```bash
npm run dev
# หรือ
npm run agent:single
```

รัน 1 รอบ: ค้นหา → เลือก → ทำงาน → รับเงิน → แสดง dashboard

### Continuous Mode

```bash
# ทุก 1 ชั่วโมง (default)
npm run agent:loop

# ทุก 10 นาที
npm run agent:fast

# กำหนด interval เอง (ms)
npm run agent:continuous  # 1hr default
```

### Custom Agent ID

```bash
npx tsx solana_job_marketplace.ts single my-custom-agent
npx tsx solana_job_marketplace.ts continuous my-agent 1800000
```

---

## Agent Cycle Flow

```
1. Discover    — ค้นหางานจาก 6 แพลตฟอร์ม
2. Score       — จัดอันดับตาม reward × difficulty × urgency × skill match
3. Select      — เลือกงานที่ score สูงสุด
4. Execute     — AI สร้าง deliverable (audit report, code, docs)
5. Verify      — ตรวจคุณภาพ (threshold: 70/100)
6. Settle      — จ่ายเงิน SOL (simulated)
7. Update      — อัปเดต profile, reputation, tier
8. Dashboard   — แสดงสรุปรายได้
```

---

## Agent Tiers

| Tier | Jobs Required | Benefits |
|------|--------------|----------|
| Bronze | 0+ | Basic jobs |
| Silver | 10+ | Medium difficulty |
| Gold | 50+ | Hard jobs, higher scoring |
| Platinum | 200+ | Expert jobs, priority access |

---

## Data Persistence

ข้อมูลทั้งหมดเก็บใน `marketplace-data.json`:

```json
{
  "profiles": [...],
  "executions": [...],
  "earnings": [...]
}
```

ดูข้อมูลด้วย:
```bash
cat marketplace-data.json | npx json
# หรือ
node -e "const d=require('./marketplace-data.json'); console.log('Jobs:', d.executions.length, 'Earnings:', d.profiles[0]?.totalEarnings)"
```

---

## DSG Control Plane Integration

เชื่อมต่อกับ DSG Control Plane เพื่อ governance:

```env
DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app/api
DSG_API_KEY=your-api-key
```

ทุก transaction จะผ่าน governance gate ก่อนดำเนินการ
(ยังไม่ได้ implement — ดู `lib/spine/` สำหรับ integration pattern)

---

## Security Notes

- **Wallet keys:** อย่า commit private key ลง repo
- **API keys:** ใช้ `.env` เท่านั้น, อย่า hardcode
- **Mainnet:** ทดสอบบน devnet ก่อนเสมอ
- **Simulated mode:** Payment เป็นการจำลอง, ไม่มี SOL จริงถูกโอน

---

## Troubleshooting

| ปัญหา | แก้ไข |
|-------|-------|
| `tsx` not found | `npm install` ใหม่ |
| Node.js version error | อัปเดตเป็น Node.js 18+ |
| Empty marketplace-data.json | รัน `npm run dev` อีกครั้ง |
| Permission denied (quickstart.sh) | `chmod +x quickstart.sh` |

---

## Known Limits

- Job discovery ใช้ข้อมูลจำลอง (ไม่ได้เรียก API จริง)
- Payment settlement เป็น simulated (ไม่มี on-chain transaction)
- Quality scoring เป็น heuristic-based
- ไม่มี IPFS upload จริง
- ไม่มี real-time job notification
