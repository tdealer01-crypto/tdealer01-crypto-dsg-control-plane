# DSG Control Plane — Quick Reference Guide

**ไกด์ด่วนสำหรับนักพัฒนา - ข้อมูลที่ใช้บ่อยทั้งหมด**

---

## 🚀 Common Commands

```bash
# Setup
npm ci                          # Clean install dependencies
npm run supabase:migrate        # Apply database migrations
npm run supabase:seed           # Load demo data

# Development
npm run dev                     # Start dev server (port 3000)
npm run build                   # Production build
npm run start                   # Run production build locally

# Testing
npm run test                    # All tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:failure           # Negative test cases
npm run test:e2e               # E2E tests (requires dev server)
npm run test:coverage          # Coverage report

# Quality Checks
npm run typecheck              # TypeScript check
npm run lint                   # ESLint
npm audit                      # Security audit

# Verification
npm run verify:policy          # Policy proof verification
npm run proof:revenue          # Revenue/billing proofs
npm run go:no-go <url>         # Production readiness gate
npm run ccvs:pipeline          # Full compliance pipeline
```

---

## 📁 Project Structure

```
project/
├── app/
│   ├── api/
│   │   ├── trinity/           # Trinity AI endpoints
│   │   │   ├── status/
│   │   │   ├── orchestrate/
│   │   │   ├── discover/
│   │   │   ├── history/
│   │   │   ├── stream/        # SSE real-time
│   │   │   └── ws/           # WebSocket placeholder
│   │   ├── health/
│   │   ├── execute/          # Main execution entry
│   │   └── ...
│   ├── dashboard/
│   │   ├── trinity/          # Trinity Dashboard UI
│   │   └── ...
│   └── middleware.ts         # Auth middleware
│
├── lib/
│   ├── spine/                # Orchestration pipeline
│   ├── agents/               # 5-agent implementation
│   │   ├── mind-agent.ts
│   │   ├── hand-agent.ts
│   │   ├── eye-agent.ts
│   │   ├── nerve-agent.ts
│   │   └── spine-agent.ts
│   ├── dsg/
│   │   ├── brain/            # Hermes executor & broker
│   │   └── deterministic/    # Policy gates
│   ├── supabase/             # Database clients
│   ├── security/             # Auth, CORS, rate limit
│   ├── runtime/              # Utilities
│   └── database.types.ts     # Generated Supabase types
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── failure/
│   ├── e2e/
│   └── proofs/
│
├── docs/
│   ├── ARCHITECTURE.md       # Detailed design
│   ├── TRINITY_DASHBOARD.md # Trinity guide
│   ├── QUICK_REFERENCE.md   # This file
│   └── ...
│
├── supabase/
│   ├── migrations/          # Schema migrations
│   └── schema.sql           # Reference snapshot
│
├── scripts/                 # Verification & deploy
├── CLAUDE.md               # AI assistant guide
├── AGENTS.md               # Agent rules
└── README.md               # Main documentation
```

---

## 🔑 Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional (for Trinity features)
GITHUB_TOKEN=ghp_...              # Job discovery
SOLANA_EARN_API_KEY=solana_...     # Solana bounties
ANTHROPIC_API_KEY=sk-...           # LLM integration

# Deployment (Vercel)
VERCEL_ENV=production/preview/development
DEPLOYMENT_URL=https://...

# Optional
NEXT_PUBLIC_SENTRY_DSN=...         # Error tracking
NEXT_PUBLIC_POSTHOG_KEY=...        # Analytics
```

**File**: `.env.local` (never commit!)

---

## 📊 Database Tables

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `runtime_intents` | Execution logs | id, agent_id, status, planHash, auditHash |
| `agent_profiles` | Agent metadata | id, reputation, tier, skills, walletAddress |
| `policies` | Governance rules | id, version, constraints, effectiveDate |
| `execution_history` | Past runs | id, jobTitle, status, executionTime |
| `audit_trails` | Immutable proof | executionId, planHash, decision, governance |
| `dsg_secrets` | Credentials | agentId, service, value (encrypted) |

### Querying Examples

```typescript
// Get agent profile
const agent = await supabase
  .from('agent_profiles')
  .select('*')
  .eq('id', agentId)
  .single();

// List recent executions
const history = await supabase
  .from('execution_history')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

// Get audit trail for execution
const trail = await supabase
  .from('audit_trails')
  .select('*')
  .eq('execution_id', executionId)
  .single();
```

---

## 🧪 Testing Patterns

### Unit Test Template

```typescript
// tests/unit/example.test.ts
import { describe, it, expect } from 'vitest';

describe('Component or Function', () => {
  it('should do X when Y', () => {
    const input = { /* ... */ };
    const expected = { /* ... */ };
    
    const result = functionUnderTest(input);
    
    expect(result).toEqual(expected);
  });
  
  it('should handle error case', () => {
    expect(() => functionUnderTest(null))
      .toThrow('Error message');
  });
});
```

### Integration Test Template

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('API Route', () => {
  let client;
  
  beforeEach(() => {
    client = createTestClient();
  });
  
  it('should return 200 with valid request', async () => {
    const res = await client.post('/api/trinity/status');
    
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/page.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

test.describe('Page Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/page-path`);
  });
  
  test('should display header', async ({ page }) => {
    const header = page.locator('h1');
    await expect(header).toBeVisible();
  });
});
```

---

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feat/your-feature

# Make changes
# ...

# Stage & commit
git add .
git commit -m "feat(scope): clear description"

# Push & create PR
git push -u origin feat/your-feature

# After PR merge
git checkout main
git pull origin main
```

### Commit Message Format

```
feat(trinity): add real-time job discovery UI
^    ^         ^
|    |         └─ Clear description
|    └─ Component/scope
└─ Type: feat|fix|docs|test|refactor|perf|chore

feat(dashboard): new feature
fix(api): bug fix
docs(readme): documentation update
test(trinity): add test cases
```

---

## 🐛 Debugging

### Enable Debug Logging

```bash
# Set debug env
DEBUG=* npm run dev

# Or per component
DEBUG=spine npm run dev
DEBUG=governance npm run dev
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `SUPABASE_URL not found` | Check `.env.local` has correct URL |
| `Type error in database.types.ts` | Run `npm run supabase:types` to regenerate |
| `Test timeout` | Increase timeout: `test.setTimeout(10000)` |
| `CORS error in browser` | Check middleware.ts auth redirect |
| `E2E tests failing` | Run `npm run dev` in separate terminal |

---

## 📈 Performance Checklists

### Before Deploying

- [ ] Run `npm run typecheck` (0 errors)
- [ ] Run `npm run build` (success)
- [ ] Run `npm run test` (all pass)
- [ ] Run `npm audit` (0 vulnerabilities)
- [ ] Review PR for breaking changes
- [ ] Update CHANGELOG if relevant
- [ ] Verify migrations run without errors

### Database Optimization

```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM runtime_intents WHERE agent_id = 'xyz';

-- List slow queries
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Rebuild indexes if needed
REINDEX TABLE audit_trails;
```

---

## 🔐 Security Checklist

- [ ] No secrets in `.env.local` committed to git
- [ ] API keys rotated regularly
- [ ] Rate limiting enabled
- [ ] Request body size limits set
- [ ] CORS headers configured
- [ ] SQL injection prevention (use parameterized queries)
- [ ] Authentication required for sensitive routes
- [ ] Audit logs enabled

---

## 📚 Documentation Links

| Doc | Purpose |
|-----|---------|
| [README.md](../README.md) | Project overview & setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed system design |
| [TRINITY_DASHBOARD.md](TRINITY_DASHBOARD.md) | Trinity Dashboard guide |
| [CLAUDE.md](../CLAUDE.md) | AI assistant rules |
| [AGENTS.md](../AGENTS.md) | Agent system rules |

---

## 🤔 FAQ

### Q: How do I add a new endpoint?

A: Create a file in `app/api/*/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return NextResponse.json({ ok: true });
}
```

### Q: How do I test the Trinity Dashboard locally?

A: 

```bash
npm run dev          # Terminal 1: Start server
npm run test:e2e     # Terminal 2: Run tests
```

### Q: How do I regenerate TypeScript types from Supabase?

A:

```bash
npm run supabase:types
npm run typecheck   # Verify no type errors
```

### Q: Where are credentials stored?

A: In Supabase `dsg_secrets` table (encrypted). Accessed via credential broker.

### Q: How do I check if the system is production-ready?

A:

```bash
npm run go:no-go https://production-url.vercel.app
```

---

## 📞 Getting Help

1. Check [TRINITY_DASHBOARD.md](TRINITY_DASHBOARD.md) for feature-specific questions
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) for design questions
3. Look at existing tests for code examples
4. Review git history: `git log --oneline lib/spine/`
5. Check GitHub issues for similar problems

---

**Last Updated**: 2026-06-29  
**Maintained By**: Development Team  
**Version**: 2.0
