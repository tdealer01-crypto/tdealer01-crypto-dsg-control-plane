# CLAUDE.md — DSG Control Plane Agent Rules

Read `AGENTS.md` first — it contains the full rule set and history.

## Tech stack

- Next.js 15 App Router, React 18, TypeScript
- Supabase auth via `@supabase/ssr` — always import client from `lib/supabase/server.ts`
- DB types in `lib/database.types.ts` — must update when adding new tables
- Vitest unit tests: `npm test`
- Deployed on Vercel — `vercel.json` uses `npm install` (not `npm ci`)
- No `@/lib/utils` in this repo — use inline `cx()` helper or `clsx` instead
- `lucide-react` is installed and available

## Tool policy

**Allowed:**
- Inspect any repository file
- Create `claude/*` branches and open pull requests
- Run `npm test`, `npm run build`, `npx tsc --noEmit`
- Push to `claude/*` branches
- Create Supabase migration files under `supabase/migrations/`

**Blocked:**
- Do not commit secrets, tokens, API keys, Supabase keys, Vercel tokens, or Claude credentials
- Do not push directly to `main` without explicit user approval or instruction
- Do not claim production-ready without live HTTP evidence
- Do not auto-merge pull requests
- Do not skip pre-commit hooks (`--no-verify`)
- Do not amend published commits

## Required PR evidence

Every pull request description must include:

| Field | Content |
|---|---|
| **Goal** | What problem this PR solves |
| **Files changed** | List with one-line reason per file |
| **Commands run** | Exact commands + summary of output |
| **Pass/fail** | Test + typecheck status |
| **Known limits** | What is NOT covered by this PR |
| **User-visible benefit** | What users gain after merge |
| **Next step** | What must happen after merge |

## Common patterns

### Auth in API routes
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Get org_id from the users table
```ts
const { data: dbUser } = await supabase
  .from('users')
  .select('org_id')
  .eq('auth_user_id', user.id)
  .single();
if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const { org_id } = dbUser;
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
All API routes must return HTTP 500 on Supabase error. No in-memory stores.
```ts
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
```
