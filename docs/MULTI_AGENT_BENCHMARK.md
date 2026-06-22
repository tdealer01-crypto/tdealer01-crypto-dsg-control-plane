# DSG ONE Multi-Agent Benchmark

Benchmark และเช็คความพร้อมของระบบ Multi-Agent Router (5 รายการ) ที่รันแบบขนานผ่าน Hermes Orchestrator

---

## วัตถุประสงค์

ยืนยันว่า 5 Agent Roles ทำงานขนานได้จริง โดยไม่ depend บน model เดียว

## Agent Roles

| Role | หน้าที่ | Default Model |
|------|---------|---------------|
| planner | Strategy, architecture, roadmaps, planning | nousresearch/nemotron-4-8b-instruct |
| coder | Coding, debugging, refactoring, build fixes, TS analysis | deepseek/deepseek-chat-v3.1 |
| auditor | Security review, risk review, contradiction detection, validation | meta-llama/llama-4-maverick:free |
| tool | Tool selection, invocation, workflow execution, automation routing | qwen/qwen-2.5-coder-32b-instruct |
| summary | Summaries, compression, executive reporting, documentation | google/gemma-3-8b-instruct:free |

---

## วิธี Benchmark

### 1. ผ่าน UI

เปิดหน้า `/dashboard/hermes/agents` → กดปุ่ม `Run Benchmark`

### 2. ผ่าน API

```bash
curl -s -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/hermes/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Run multi-agent parallel benchmark: plan, build, review, execute, and summarize a minimal DSG deploy checklist.",
    "conversationHistory": []
  }'
```

### 3. ผ่าน cURL ตรง endpoint บนเครื่อง

```bash
cd /data/data/com.termux/files/home/tdealer01-crypto-dsg-control-plane
npx tsx -e "
import { orchestrateChat, AGENTS } from './lib/hermes-orchestrator';
const res = await orchestrateChat({
  message: 'Benchmark all 5 roles: plan, code, audit, tool, summary.',
});
console.log(JSON.stringify({
  ok: res.ok,
  primaryRole: res.primaryRole,
  agentsUsed: res.agentsUsed.map(a => ({
    role: a.role,
    model: a.model,
    ok: a.ok,
    latencyMs: a.latencyMs,
    outputSnippet: a.output.slice(0, 100)
  }))
}, null, 2));
"
```

---

## Expected Output

```json
{
  "ok": true,
  "primaryRole": "planner",
  "agentsUsed": [
    { "role": "planner", "model": "...", "ok": true, "latencyMs": >0 },
    { "role": "coder", "model": "...", "ok": true, "latencyMs": >0 },
    { "role": "auditor", "model": "...", "ok": true, "latencyMs": >0 },
    { "role": "tool", "model": "...", "ok": true, "latencyMs": >0 },
    { "role": "summary", "model": "...", "ok": true, "latencyMs": >0 }
  ]
}
```

### Acceptance Criteria

- [ ] `ok === true`
- [ ] `agentsUsed.length === 5`
- [ ] ทุก agent `ok === true`
- [ ] ทุก agent `latencyMs > 0`
- [ ] Response รวม output จาก >=3 agent ขึ้นไป

---

## ปัญหาที่พบบ่อย

| Symptom | Cause | Fix |
|---------|--------|-----|
| `ok: false`, agents empty | `OPENROUTER_API_KEY` ไม่มีหรือผิด | ตรวจสอบ env หรือ `.env.local` |
| `ok: false`, 1-2 agent ไม่ได้ output | Free tier model change หรือ rate limit | ดู `model` และ `latencyMs` ใน benchmark result |
| 403/401 จาก OpenRouter | API key revoked หรือหมดอายุ | Renew key ใหม่ |
| Timeout | พยายามรันหลาย model พร้อมกันเกินขีดจำกัด | ลอง ping OpenRouter ทีละตัวเพื่อเช็ค availability |

---

## Product UI Reference

หน้าแสดงผล live: `/dashboard/hermes/agents`

- แสดง 5 agent cards พร้อมสถานะ
- ปุ่ม `Run Benchmark`  executes parallel mesh และแสดง latency
- แสดงผลรวม (synthesized response) ร่วมกับ individual agent outputs
