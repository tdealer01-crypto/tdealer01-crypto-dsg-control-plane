# Build-in-Public Update — DSG ONE (ProofGate)

> เวอร์ชันสำหรับโพสต์ X / LinkedIn (ภาษาอังกฤษ — บอกได้ถ้าอยากได้เวอร์ชันไทยหรือสั้นลง)

---

**Post draft:**

Most "AI safety" READMEs tell you what their product can do.

Ours spends just as much space telling you what it *can't* claim yet.

Quick update on DSG ONE (ProofGate) — a deterministic gate that checks AI/agent actions against policy *before* they execute, and exports a hash-based evidence trail for every decision:

→ Test suite: 85 → 185 → 252 tests passing across three baselines, zero failures each time, TypeScript typecheck clean.
→ All 34 Supabase migrations accounted for and documented in the deploy runbook.
→ The deterministic gate API (`/api/dsg/v1/gates/evaluate`) is live — you can curl it right now and get back a structured PASS/REVIEW/BLOCK decision with replay-protection fields.

What it still can't claim, on the record:
→ No external Z3 solver invoked in production yet (the gate is a deterministic TypeScript static-check scaffold — the formal-verification work is a separate, cited artifact, not yet wired end-to-end).
→ No completed JWT/JWKS auth, no WORM evidence storage, no third-party certification.
→ Production go-live isn't closed — that needs live deployment checks, not just passing tests.

Why post the gaps too: in a category full of "formally verified" marketing that often isn't, being precise about the line between *evidence* and *aspiration* is the actual differentiator — especially for anyone evaluating this for real agent workflows.

Repo (public): github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane

---

## หมายเหตุการใช้งาน
- เนื้อหานี้อ้างอิงเฉพาะตัวเลข/สถานะที่ตรวจสอบได้จาก `PROJECT_TRUTH.md` และ `DECISION_LOG.md` (last reviewed 2026-05-15) — **ไม่ได้เพิ่มคำว่า "production-ready", "enterprise-grade", "formally verified" หรือคำกล่าวอ้างใดๆที่เกินขอบเขตที่ repo เองอนุญาต**
- ถ้ารัน test/typecheck ใหม่แล้วได้ตัวเลขต่างจากนี้ (gap 1 เดือนที่ระบุในรายงาน dev activity) ให้แก้ตัวเลขในโพสต์ก่อนเผยแพร่ — ห้ามใช้ตัวเลขเก่าถ้ามีของใหม่แล้ว
- ถ้าต้องการเวอร์ชันภาษาไทย หรือเวอร์ชันสั้นแบบ tweet เดี่ยว (ไม่ใช่ thread) บอกได้
