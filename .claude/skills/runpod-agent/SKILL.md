---
name: runpod-agent
description: จัดการ GPU workloads บน Runpod ผ่าน MCP server และ Runpod CLI — สร้าง/หยุด/ลบ Pods, deploy Serverless endpoints, ตรวจสอบ GPU availability, จัดการ templates และ network volumes ใช้เมื่อผู้ใช้พูดถึง Runpod, GPU pod, Serverless GPU endpoint, runpodctl หรือการ deploy โมเดล ML บน GPU cloud
---

# Runpod Agent Skill

Skill นี้สอนวิธีจัดการทรัพยากร GPU บน Runpod สำหรับโปรเจกต์ DSG ONE / ProofGate Control Plane

## Prerequisites (ตรวจสอบก่อนเริ่ม)

1. **API key**: ต้องมี `RUNPOD_API_KEY` ในสภาพแวดล้อม
   - Production: ตั้งค่าใน Vercel project environment variables แล้ว (ตรวจสอบด้วยชื่อ ไม่พิมพ์ค่า)
   - Local: export ใน shell หรือใส่ใน `.env` (ห้าม commit ค่าเด็ดขาด)
   - ตรวจสอบว่า deployment มี key: `GET /api/runpod/status` คืน `{ "configured": true }`
2. **MCP server**: `.mcp.json` ของ repo นี้กำหนด server `runpod` (stdio ผ่าน `npx @runpod/mcp-server@latest`) และ `runpod-docs` (HTTP ที่ `https://docs.runpod.io/mcp`) ไว้แล้ว
   - ถ้าเครื่องมือ `mcp__runpod__*` ไม่ปรากฏ ให้ผู้ใช้ตรวจสอบ `/mcp` และการตั้งค่า `RUNPOD_API_KEY`
3. **CLI (ทางเลือก)**: `runpodctl` — ติดตั้งด้วย `curl -sSL https://cli.runpod.net | bash` แล้วยืนยันด้วย `runpodctl doctor`

## เลือกเครื่องมือให้ถูก

| งาน | เครื่องมือ |
| --- | --- |
| สร้าง/ลิสต์/หยุด/ลบ Pods, endpoints, templates, volumes | Runpod MCP tools (`mcp__runpod__*`) |
| ถามความรู้/วิธีใช้ฟีเจอร์ Runpod | Runpod docs MCP (`mcp__runpod-docs__*`) หรือ https://docs.runpod.io/llms.txt |
| โอนไฟล์, SSH, model caching, Hub deployments | `runpodctl` ผ่าน Bash |
| ตรวจว่า key ถูกตั้งใน deployment | `GET /api/runpod/status` (คืนแค่ configured boolean) |

## ตัวอย่างงานที่ทำได้

- "List my Runpod endpoints" / "แสดง Pods ทั้งหมดของฉัน"
- "Create a Pod with an RTX 4090" — ระบุ name, image, GPU type, GPU count, cloud type (SECURE/COMMUNITY)
- "Deploy a Serverless endpoint using template X" — ระบุ min/max workers
- "Stop the Pod named ml-training-pod"
- "What GPUs are available?" / "Show my account balance"

## กฎความปลอดภัยของ repo นี้ (บังคับ)

1. **ห้ามพิมพ์หรือ commit ค่า `RUNPOD_API_KEY`** — อ้างอิงด้วยชื่อ env var เท่านั้น (ตาม CLAUDE.md §9)
2. **การกระทำที่มีค่าใช้จ่าย** (สร้าง Pod, เพิ่ม workers, ซื้อ storage) — แจ้ง GPU type/ราคาโดยประมาณและขอยืนยันจากผู้ใช้ก่อน เว้นแต่ผู้ใช้สั่ง spec ชัดเจนแล้ว
3. **การกระทำทำลายล้าง** (terminate/delete Pod, ลบ volume, ลบ endpoint) — ยืนยันชื่อ/ID ที่แน่นอนกับผู้ใช้ก่อนเสมอ
4. **Claim boundary**: อย่าอ้างว่า endpoint/Pod "พร้อม production" จากการสร้างสำเร็จอย่างเดียว — ต้องมีหลักฐานสถานะจริง (เช่น ผลจาก list/get ที่แสดง status RUNNING/READY) ตามนโยบาย evidence-first ของ repo
5. หลักฐานทุกอย่างรายงานตามจริง: ถ้าคำสั่งล้มเหลวหรือไม่ได้รัน ให้บอกว่า `Not run` พร้อมเหตุผล

## Quick reference

```bash
# ตรวจสอบ CLI + auth
runpodctl doctor

# ลิสต์ pods ผ่าน CLI
runpodctl get pod

# ตรวจว่า deployment บน Vercel มี key แล้ว (ไม่เปิดเผยค่า)
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/runpod/status"
```

เอกสารเต็ม: `docs/RUNPOD_INTEGRATION.md` และ https://docs.runpod.io/llms.txt
