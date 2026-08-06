# Runpod Integration — DSG ONE / ProofGate Control Plane

เอกสารนี้อธิบายการเชื่อมต่อ Runpod (GPU cloud) เข้ากับโปรเจกต์นี้: MCP servers, agent skill, การตั้งค่า API key และขอบเขตการอ้างสถานะ (claim boundary)

สถานะปัจจุบัน: **setup-ready** — มีการกำหนดค่า MCP + skill + env var name แล้ว การใช้งานจริงต้องมี `RUNPOD_API_KEY` ที่ใช้งานได้ในสภาพแวดล้อมนั้น ๆ

---

## 1. ส่วนประกอบ

| ส่วนประกอบ | ตำแหน่ง | หน้าที่ |
| --- | --- | --- |
| Runpod API MCP server | `.mcp.json` → `runpod` | จัดการ Pods, Serverless endpoints, templates, network volumes, registries ผ่าน Runpod REST API |
| Runpod docs MCP server | `.mcp.json` → `runpod-docs` | ค้นหาเอกสาร Runpod (ไม่ต้องการ API key) |
| Agent skill | `.claude/skills/runpod-agent/SKILL.md` | สอน AI agent ให้ใช้เครื่องมือ Runpod อย่างถูกต้องและปลอดภัย |
| Env var | `.env.example` → `RUNPOD_API_KEY` | ชื่อ env var สำหรับ API key (ชื่อเท่านั้น ห้าม commit ค่า) |
| Status probe | `GET /api/runpod/status` | ตรวจว่า deployment มี `RUNPOD_API_KEY` แล้วหรือไม่ (คืน boolean เท่านั้น ไม่แตะ Runpod API และไม่เปิดเผยค่า) |

## 2. การตั้งค่า API key

สร้าง key ได้ที่ https://console.runpod.io/user/settings

- **Vercel (production)**: ตั้งค่า `RUNPOD_API_KEY` ใน Project → Settings → Environment Variables แล้ว redeploy เพื่อให้ route อ่านค่าใหม่ได้
- **Local development**:

```bash
export RUNPOD_API_KEY=<key>       # ชั่วคราวใน shell
# หรือใส่ใน .env (git-ignored) — ห้าม commit ค่าเด็ดขาด
```

ตรวจสอบว่า deployment เห็น key แล้ว (ไม่เปิดเผยค่า):

```bash
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/runpod/status"
# คาดหวัง: {"service":"runpod","configured":true,...}
```

`configured: true` แปลว่า env var ถูกตั้งค่าแล้วเท่านั้น — ไม่ได้พิสูจน์ว่า key ใช้งานได้กับ Runpod API การพิสูจน์ว่า key ใช้งานได้ต้องเรียก Runpod API จริง (เช่น list pods ผ่าน MCP หรือ `runpodctl get pod`)

## 3. MCP servers ใน `.mcp.json`

```json
"runpod": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@runpod/mcp-server@latest"],
  "env": { "RUNPOD_API_KEY": "${RUNPOD_API_KEY}" }
},
"runpod-docs": {
  "type": "http",
  "url": "https://docs.runpod.io/mcp"
}
```

- `runpod` รันเป็น local stdio process และอ่าน key จาก env ของเครื่องที่รัน Claude Code — ต้อง export `RUNPOD_API_KEY` ก่อนเปิด session
- `runpod-docs` เป็น hosted HTTP server ไม่ต้องการการยืนยันตัวตน
- ตรวจสอบการเชื่อมต่อใน Claude Code ด้วยคำสั่ง `/mcp`

## 4. Runpod CLI (ทางเลือก)

```bash
curl -sSL https://cli.runpod.net | bash   # หรือ: brew install runpod/runpodctl/runpodctl
runpodctl doctor                          # ตรวจการติดตั้ง + บันทึก key ลง ~/.runpod/config.toml
runpodctl get pod                         # ลิสต์ pods
```

CLI ใช้ `RUNPOD_API_KEY` ตัวเดียวกับ MCP server

## 5. Claim boundaries (ตามนโยบาย evidence-first)

อนุญาต:

- `setup-ready` — ไฟล์ config/skill/docs อยู่ใน repo (ตรวจได้จากไฟล์)
- `configured` — `GET /api/runpod/status` คืน `configured: true` จาก deployment จริง
- `key ใช้งานได้` — เมื่อมีผลลัพธ์จริงจากการเรียก Runpod API (list pods/endpoints สำเร็จ)

ห้ามอ้างโดยไม่มีหลักฐานสด:

- "Runpod production workload live" — ต้องมีสถานะ Pod/endpoint จริงจาก API
- "GPU endpoint พร้อมให้บริการ" — ต้องมีผล health/status ของ endpoint นั้น
- ค่าใช้จ่าย/ยอดคงเหลือ — ต้องมาจาก account API จริงเท่านั้น

## 6. ความปลอดภัย

- ห้าม commit หรือพิมพ์ค่า `RUNPOD_API_KEY` ในโค้ด, เอกสาร, log, PR body (CLAUDE.md §9)
- `GET /api/runpod/status` เจตนาให้เป็น public probe แบบเดียวกับ `/api/health` — คืนเฉพาะ boolean ว่าตั้งค่าแล้วหรือไม่ ไม่คืนค่า key, ไม่เรียก Runpod API, ไม่เปิดเผยข้อมูลบัญชี
- การกระทำที่มีค่าใช้จ่ายหรือทำลายล้าง (สร้าง/ลบ Pod, ลบ volume) ต้องยืนยันกับผู้ใช้ก่อนตามกฎใน skill

## 7. อ้างอิง

- Documentation index: https://docs.runpod.io/llms.txt
- MCP servers: https://docs.runpod.io/get-started/mcp-servers
- Agent skills plugin: `npx skills add runpod/runpod-plugins-official`
- CLI reference: https://docs.runpod.io/runpodctl/overview
- MCP source: https://github.com/runpod/runpod-mcp
