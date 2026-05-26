# AGENTS.md

## DSG repo rules

- Read real files before editing.
- Do not add mock production evidence.
- Do not mark PASS without real file, route, test, deployment, or owner approval evidence.
- Use PASS / REVIEW / BLOCKED for readiness states.
- REVIEW and BLOCKED must include nextAction.
- Preserve existing package scripts.
- Do not add dependencies unless necessary.
- Run:
  - npm run lint
  - npm run dsg:typecheck
  - npm run build:termux
  - npm run smoke:marketplace-readiness
  - npm run smoke:app-builder-flow-proof
  - npm run smoke:audit-packet
  - npm run smoke:first-value-flow
- If APP_URL is required, use:
  export APP_URL="https://dsg-one-v1.vercel.app"

---

## DSG GraphMap Plugin — กฎการใช้งานสำหรับ agent (2026-05-26)

### ใช้เมื่อไหร่

ก่อนตอบคำถามเกี่ยวกับโครงสร้าง repo ต้อง query GraphMap ก่อนเสมอ ตัวอย่างคำถามที่ต้อง query ก่อน:

- "route ไหนแตะ table ไหน"
- "policy / gate ไหนคุม API ไหน"
- "test ไหนควรเกี่ยวกับไฟล์นี้"
- "ไฟล์นี้ import จากที่ไหนบ้าง"
- "อะไรอยู่ใน directory เดียวกันกับไฟล์นี้"

### วิธีใช้

```
GET  /api/plugins/graphmap/status
  → ถ้า status=EMPTY หรือ isStale=true → POST /api/plugins/graphmap/build ก่อน

POST /api/plugins/graphmap/build
  body: {} (ใช้ default include/exclude patterns)
  → รอ ok: true, nodeCount > 0

POST /api/plugins/graphmap/query
  body: { "question": "<คำถามเกี่ยวกับ repo>", "max_depth": 2 }
  → อ่าน decision + evidence ก่อนตอบ
```

### กฎการตีความ decision

| decision | ความหมาย | สิ่งที่ agent ควรทำ |
|---|---|---|
| `ALLOW` | หลักฐาน EXTRACTED ≥3 ชิ้น graph ไม่เก่า | ตอบได้โดยอ้างอิง evidence |
| `REVIEW` | มี INFERRED หรือ graph เก่ากว่า 24h | ตอบแบบ "น่าจะ" บอก confidence ด้วย |
| `BLOCK` | ไม่มี evidence | ห้ามเดา — บอก user ว่าต้อง build graph ก่อน |

### ห้ามทำ

- ห้ามตอบคำถาม repo structure โดยไม่ query GraphMap ก่อน
- ห้าม claim ว่า "route X แตะ table Y" ถ้า decision เป็น BLOCK หรือ REVIEW + confidence INFERRED
- ห้าม build graph ถ้า status=READY และ isStale=false (ใช้ของเดิมได้)

### Auth

ทุก endpoint ต้องส่ง `Authorization: Bearer <supabase_jwt>` — ดึง token จาก user session ที่ login อยู่

---

 — branch `claude/analyze-files-RHRKg` → merged to `main`

### Security fixes
- **`middleware.ts`** — เขียนใหม่ทั้งหมด: เพิ่ม JWT structural validation ด้วย native `atob`/`JSON.parse` (ห้ามใช้ Supabase library ใน middleware เด็ดขาด เพราะ repo นี้ไม่มี `@supabase/ssr`)
- **`middleware.ts` matcher** — เปลี่ยนจาก `['/dashboard/:path*']` (route ไม่มีอยู่จริง) เป็น `['/dsg/:path*', '/enterprise/:path*', '/generated-apps/*']` ที่มีอยู่จริง

### ไฟล์ใหม่: Market parity features
- `app/dsg/templates/page.tsx` + `app/api/dsg/templates/route.ts` — Template gallery (12 templates, search, category filter, Popular badge)
- `app/dsg/analytics/page.tsx` + `app/api/dsg/analytics/route.ts` — Analytics dashboard (recharts BarChart, toggle 7d/30d/90d)
- `app/dsg/history/page.tsx` + `app/api/dsg/history/route.ts` — Build history timeline (compare mode, restore, diff stats, pagination)
- `app/dsg/notifications/page.tsx` + `app/api/dsg/notifications/route.ts` — Notifications feed (filter tabs, mark-read, settings panel)

### ไฟล์ใหม่: UI/UX
- `app/page.tsx` (updated) — เปลี่ยนจาก bare `redirect('/dsg/action-layer')` เป็น welcome page เต็ม (hero, how-it-works, template chips, recent builds)
- `app/dsg/layout.tsx` (new) — Left sidebar 220px สำหรับทุก `/dsg/*` pages แบ่ง 3 section: Build / Manage / Insights พร้อม mobile hamburger
- `components/toast.tsx` — Toast system (success/error/info/warning, auto-dismiss, CSS transition ไม่ใช้ framer-motion)
- `components/skeleton.tsx` — 5 skeleton variants ใช้ `cn` จาก `@/lib/utils` ได้เลย (ไฟล์มีอยู่แล้วใน repo นี้)
- `components/onboarding-checklist.tsx` — 5-step onboarding, localStorage-persisted (`dsg_onboarding_*` keys), dismissible
- `components/empty-state.tsx` — Reusable empty state component
- `app/layout.tsx` (updated) — เพิ่ม `<ToastProvider>` ครอบ children

### กฎที่ต้องรู้สำหรับ agent ที่จะทำต่อ
- **ห้ามใช้ `@supabase/ssr` หรือ `@supabase/supabase-js` ใน `middleware.ts`** — repo นี้ไม่มี package เหล่านั้น ให้ใช้ native `atob`/`JSON.parse` สำหรับ JWT validation เท่านั้น
- **`lucide-react: ^0.553.0`** มีอยู่ใน `package.json` แล้ว ใช้ได้เลย
- **`recharts: ^3.8.1`** มีอยู่แล้ว ใช้ได้เลย
- **`lib/utils.ts`** มีอยู่แล้ว — `cn()` ใช้ได้จาก `@/lib/utils`
- **Vercel deploy** — ไม่มี `vercel.json` ใช้ default settings ของ Vercel (`npm install` อัตโนมัติ)
- **Build command** — ใช้ `npm run build` หรือ `node scripts/dsg-next-build.mjs` ไม่ใช่ `next build` ตรงๆ
- **`app/dsg/layout.tsx`** มีอยู่แล้วตั้งแต่ merge นี้ — ถ้าจะเพิ่มหน้าใน `/dsg/*` ไม่ต้องสร้าง layout ใหม่

### งานที่ยังต้องทำ (ยังเป็น mock data)
- API routes ใหม่ทั้งหมด (templates, analytics, history, notifications) ยังคืน mock JSON — ต้องต่อ Supabase tables จริงก่อน production
- `components/onboarding-checklist.tsx` ใช้ localStorage เท่านั้น ยังไม่ persist ใน DB
- `app/page.tsx` welcome page แสดง recent builds แบบ mock — ต้องดึงจาก API จริง
