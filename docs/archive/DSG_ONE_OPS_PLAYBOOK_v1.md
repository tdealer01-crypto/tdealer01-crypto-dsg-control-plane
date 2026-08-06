# DSG ONE — Ops Playbook v1

> ใช้สำหรับให้ทีมสามารถรัน maintain/production ops เบื้องต้นได้ แบบ evidence-first

---

## 1) โหลด playbook นี้ก่อน ops soccer/incident
อ่าน:
- `docs/RUNBOOK_DEPLOY.md`
- `docs/REPO_TRUTH.md`

เชื่อ evidence ล่าสุดให้ทันงาน ไม่ใช้ qa-logs เดิมเก่ากว่าวันที่ current run

---

## 2) Preflight สั้นก่อน ops
1. `/api/health`
2. `/api/readiness`
3. confirm `/api/agent/status` env=production + commit hash

ถ้าใดอัน fail ให้หยุด ops และเก็บ error log (curl + timestamp) ก่อนแก้ไข

---

## 3) migration apply เงื่อนไข
ก่อน apply migration ให้:
1. backup ตาราง `public.runtime_commit_execution` definition
2. backup ทุก的新增/alter เป็น ddl sep
3. run migration ตามลำดับอ้าง RUNBOOK_DEPLOY.md
4. verify ผ่าน query จำนวน table/function ที่คาดหวัง
5. เก็บ log แสดง行/ seq ล่าสุด

---

## 4) incident maintenance bookmarks
- Vercel deployment error -> rerun workflow ผ่าน CLI สำรอง
- runtime commit RPC missing -> ใช้ `scripts/apply-runtime-rpc-fix.sh` เป็น first step
- auth fail -> ตรวจ/env vars + Supabase site/URL redirect match
- staging workflow -> deploy preview + rerun smoke

---

## 5) ถามก่อนเลือก action ต่อจาก ops
1. latest deployment status = ready หรือไม่
2. migrations ล่าสุดที่ apply ส่งผลต่อ schema แล้วหรือยัง
3. endpoints ต้องกู้การตรวจ health/readiness ล่าสุด
4. evidence เก็บไว้ก่อนแก้

---

## 6) บันทึก log ที่ควรเก็บหลัง ops
- timestamp
- commit id / sha ทีทำรายการ
- ลิสต์ endpoint/status หลัง deploy/fix
- follow-up ต่อ 5 ลำดับถัดไป
