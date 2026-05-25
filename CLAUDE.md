# CLAUDE.md — DSG One v1 Agent Rules

Read `AGENTS.md` first — especially the middleware critical rule.

## Tech stack

- Next.js 15 App Router, React 19, TypeScript
- Supabase via `lib/dsg/server/supabase-rpc.ts` — use `readDsgRest` / `callDsgRpc`
- Auth via `requireVerifiedDsgActor(req.headers, permission)` from `lib/dsg/server/context.ts`
- `lib/utils.ts` exists — `cn()` from `clsx` + `tailwind-merge` is available
- `lucide-react` and `recharts` are installed
- **No `@supabase/ssr`** — package is not installed, do not import it

## CRITICAL: Middleware rule

Never use any Supabase library in `middleware.ts`.
No `createClient`, no `@supabase/ssr`, no `createServerClient`.
Validate JWT using native browser APIs only:
```ts
const [, payload] = token.split('.');
const { exp } = JSON.parse(atob(payload));
if (Date.now() / 1000 > exp) { /* expired */ }
```

## Tool policy

**Allowed:**
- Inspect any repository file
- Create `claude/*` branches and open pull requests
- Run `npm run build`, `npx tsc --noEmit`
- Run `node scripts/dsg-next-build.mjs` if available
- Push to `claude/*` branches
- Create Supabase migration files under `supabase/migrations/`

**Blocked:**
- Do not commit secrets, tokens, API keys, Supabase keys, Vercel tokens, or Claude credentials
- Do not push directly to `main` without explicit user approval or instruction
- Do not claim production-ready without live HTTP evidence
- Do not auto-merge pull requests
- Do not import `@supabase/ssr` anywhere in this repo
- Do not add Supabase library calls to `middleware.ts`

## Required PR evidence

Every pull request description must include:

| Field | Content |
|---|---|
| **Goal** | What problem this PR solves |
| **Files changed** | List with one-line reason per file |
| **Commands run** | Exact commands + summary of output |
| **Pass/fail** | Build + typecheck status |
| **Known limits** | What is NOT covered by this PR |
| **User-visible benefit** | What users gain after merge |
| **Next step** | What must happen after merge |

## Common patterns

### Auth in API routes
```ts
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';

export async function GET(req: NextRequest) {
  const actor = await requireVerifiedDsgActor(req.headers, 'read:history');
  // actor.actorId = user UUID
}
```

### Read rows scoped to current user
```ts
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

const config = getDsgSupabaseRpcConfig();
const rows = await readDsgRest<MyRow[]>(config, 'table_name', {
  select: '*',
  user_id: `eq.${actor.actorId}`,
  order: 'created_at.desc',
});
```

### Next.js 15 async params (required — will type-error otherwise)
```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
}
```

### No mock fallbacks
All API routes must return HTTP 500 on Supabase error. No static arrays.
```ts
try {
  const data = await readDsgRest(...);
  return NextResponse.json({ ok: true, data });
} catch (err) {
  return NextResponse.json({ error: String(err) }, { status: 500 });
}
```

## Client stores (`store/`)

All browser-persistent shared state lives in `store/`. Import from the barrel:

```ts
import { useChecklist, useAppLanguage, checklistStore, languageStore } from '@/store';
```

### Available hooks

| Hook | Returns | Use when |
|---|---|---|
| `useChecklist()` | `{ dismissed, completedSteps, dismiss, restore, completeStep, uncompleteStep, toggleStep }` | onboarding widget หรือ settings page |
| `useAppLanguage(default?)` | `'th' \| 'en'` | component ที่ต้องรู้ภาษาปัจจุบัน |

### Available stores (raw — ใช้เมื่อเรียกนอก component)

| Store | Key methods |
|---|---|
| `checklistStore` | `.getSnapshot()` `.update(patch)` `.subscribe(cb)` |
| `languageStore` | `.getSnapshot()` `.setLanguage(lang)` `.subscribe(cb)` |

### Rules สำหรับ store ใหม่

- สร้างไฟล์ใน `store/` เสมอ ไม่ใช้ useState + useEffect สำหรับ localStorage
- export hook convenience ใน `store/useXxx.ts` แล้วเพิ่มใน `store/index.ts`
- `getSnapshot` ต้องคืน stable reference (cache + freeze)
- `subscribe` ต้องลงทะเบียน window listener แค่ครั้งเดียว (lazy mount/unmount pattern)
- ห้าม setState ใน useEffect — ใช้ `useSyncExternalStore` แทน

## Production control loop

### Check if production is alive
GET https://dsg-one-v1.vercel.app/api/agent/status

### Ship from chat (triggers CI → verify)
Use GitHub MCP tool `mcp__github__create_dispatch_event` or trigger workflow_dispatch on `.github/workflows/ship.yml` with input `reason: "<what you did>"`.

### Full loop
1. Write code → commit → push to claude/* branch
2. Open PR or push to main
3. Vercel auto-deploys
4. Call GET /api/agent/status to verify deploy is live
5. If status ok → done. If not → diagnose and fix.

