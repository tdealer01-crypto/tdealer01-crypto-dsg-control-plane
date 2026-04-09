# Fix Production Gaps — DSG Control Plane

## Overview
Skill นี้แก้ไข 10 ปัญหาที่พบจากการ audit ระบบ DSG Control Plane
เรียงตาม priority จาก Critical → Low

---

## Fix 1: Middleware bypass เมื่อ env ขาด (Critical)

**ไฟล์:** `middleware.ts`
**ปัญหา:** ถ้า `NEXT_PUBLIC_SUPABASE_URL` หรือ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ไม่มี middleware จะ `return response` ตรงๆ — ปล่อยให้ทุก request เข้า dashboard ได้โดยไม่ต้อง login

**แก้:** เปลี่ยนจาก passthrough เป็น return 503 สำหรับ dashboard paths, ปล่อย public paths ผ่าน

```typescript
// middleware.ts — แก้ lines 17-19
if (!url || !key) {
  // Public paths ปล่อยผ่าน (health, login, pricing, static)
  const { pathname } = request.nextUrl;
  if (
    pathname === '/api/health' ||
    pathname === '/login' ||
    pathname === '/pricing' ||
    pathname === '/' ||
    pathname.startsWith('/api/') // API routes handle their own auth
  ) {
    return response;
  }
  // Dashboard paths → block with 503
  if (isDashboardPath(pathname)) {
    return new NextResponse(
      JSON.stringify({ error: 'Service temporarily unavailable — missing configuration' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }
  return response;
}
```

**เทส:** เปิด dashboard โดยไม่ตั้ง `NEXT_PUBLIC_SUPABASE_URL` → ต้องได้ 503 แทนที่จะเข้าได้

---

## Fix 2: Rate limit ไม่ทำงานบน Vercel serverless (Critical)

**ไฟล์:** `lib/security/rate-limit.ts`
**ปัญหา:** เมื่อไม่มี `UPSTASH_REDIS_REST_URL` จะ fallback เป็น in-memory `Map<string, Bucket>` — บน Vercel serverless แต่ละ invocation อาจได้ instance ใหม่ ทำให้ rate limit ไม่มีผล

**แก้ (ทางเลือก A — แนะนำ):** ตั้ง Upstash Redis

```bash
# สร้าง Upstash Redis ที่ https://console.upstash.com
# แล้วตั้ง env บน Vercel:
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

**แก้ (ทางเลือก B):** เพิ่ม warning log เมื่อ fallback เพื่อให้รู้ว่า rate limit ไม่ทำงานจริง

```typescript
// lib/security/rate-limit.ts — เพิ่มใน applyRateLimit() ก่อน return applyMemoryRateLimit
export async function applyRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const prefix = options.key.split(':')[0] || 'default';
  const limiter = getLimiter(prefix, options.limit, options.windowMs);

  if (!limiter) {
    if (!warnedMemoryFallback) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-memory fallback (ineffective on serverless)');
      warnedMemoryFallback = true;
    }
    return applyMemoryRateLimit(options);
  }
  // ... rest unchanged
}
```

**เทส:** ดู Vercel function logs → ต้องไม่เห็น warning ถ้าตั้ง Upstash แล้ว

---

## Fix 3: ไม่มี error tracking / observability (High)

**ไฟล์:** `lib/security/api-error.ts`, `package.json`
**ปัญหา:** `logApiError()` ใช้แค่ `console.error()` — ไม่มี Sentry, Datadog, หรือ log drain ใดๆ ถ้า production พัง จะไม่มี alert

**แก้:** เพิ่ม Sentry (หรือ log drain อื่น)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

แล้วแก้ `lib/security/api-error.ts`:

```typescript
// lib/security/api-error.ts — เพิ่ม Sentry capture
import * as Sentry from '@sentry/nextjs';

export function logApiError(route: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${route}]`, {
    error: redactSensitive(error),
    ...(details ? redactSensitive(details) as Record<string, unknown> : {}),
  });

  // ส่งไป Sentry (ถ้ามี DSN)
  if (error instanceof Error) {
    Sentry.captureException(error, { tags: { route }, extra: details });
  } else {
    Sentry.captureMessage(`[${route}] ${String(error)}`, { level: 'error', extra: details });
  }
}
```

ตั้ง env:
```bash
vercel env add SENTRY_DSN production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

**เทส:** trigger error → ดู Sentry dashboard ว่ามี event เข้า

---

## Fix 4: Health route ไม่เช็ค Supabase (Medium)

**ไฟล์:** `app/api/health/route.ts`
**ปัญหา:** `/api/health` เช็คแค่ `getDSGCoreHealth()` — ไม่เช็คว่า Supabase DB ต่อได้หรือไม่ ถ้า DB ล่ม health ยังบอก ok

**แก้:** เพิ่ม DB ping

```typescript
// app/api/health/route.ts — เพิ่มหลัง getDSGCoreHealth()
import { getSupabaseAdmin } from '../../../lib/supabase-server';

// ใน GET handler:
let dbOk = false;
let dbError: string | null = null;
try {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('organizations').select('id').limit(1);
  dbOk = !error;
  if (error) dbError = error.message;
} catch (err) {
  dbError = err instanceof Error ? err.message : 'DB unreachable';
}

return Response.json({
  ok: core.ok && dbOk,
  service: 'dsg-control-plane',
  timestamp: new Date().toISOString(),
  core_ok: core.ok,
  db_ok: dbOk,
  error: core.ok && dbOk ? null : (coreDetails.error ?? dbError ?? null),
  core: { /* ... existing ... */ },
  db: { ok: dbOk, error: dbOk ? null : dbError },
}, { headers: buildRateLimitHeaders(rateLimit, 60) });
```

**เทส:** `curl /api/health` → ต้องเห็น `db_ok: true` ถ้า Supabase ต่อได้

---

## Fix 5: MCP call route fetch ตัวเอง (Medium)

**ไฟล์:** `app/api/mcp/call/route.ts`
**ปัญหา:** Lines 45 + 59 ทำ `fetch(${origin}/api/intent)` และ `fetch(${origin}/api/execute)` — เป็นการ fetch กลับมาที่ตัวเอง ซึ่งบน serverless อาจ timeout หรือเสีย cold start ซ้ำ

**แก้:** เรียก engine functions ตรงแทน fetch

```typescript
// app/api/mcp/call/route.ts — แทนที่ fetch ด้วย direct call
import { issueSpineIntent, executeSpineIntent } from '../../../../lib/spine/engine';

// แทนที่ fetch /api/intent:
const intentResult = await issueSpineIntent({
  orgId: access.orgId,
  apiKey: auth.replace('Bearer ', ''),
  payload: {
    agentId: body?.agent_id,
    action: body?.action || 'mcp-call',
    canonicalRequest: body?.payload ?? {},
    input: body?.payload ?? {},
    context: { source: 'mcp' },
  },
});

if (!intentResult.ok) {
  return NextResponse.json(
    { error: intentResult.body?.error || 'Intent failed' },
    { status: intentResult.status, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
  );
}

// แทนที่ fetch /api/execute:
const executeResult = await executeSpineIntent({
  orgId: access.orgId,
  apiKey: auth.replace('Bearer ', ''),
  payload: {
    agentId: body?.agent_id,
    action: body?.action || 'mcp-call',
    canonicalRequest: body?.payload ?? {},
    input: body?.payload ?? {},
    context: { source: 'mcp', intent_request_id: intentResult.body?.request_id },
  },
});
```

**เทส:** `POST /api/mcp/call` → ต้องทำงานเหมือนเดิมแต่ไม่มี internal fetch ใน Vercel function logs

---

## Fix 6: Fake Stripe IDs จาก auto-setup (Medium)

**ไฟล์:** `app/api/setup/auto/route.ts`
**ปัญหา:** Lines 149-158 สร้าง `stripe_subscription_id: auto_trial_${orgId}` และ `stripe_customer_id: auto_cus_${orgId}` — ถ้า billing webhook มาจริง อาจ conflict หรือ confuse logic

**แก้:** ใช้ prefix `placeholder_` + เพิ่ม `is_placeholder` flag + cleanup logic เมื่อ Stripe จริงมา

```typescript
// app/api/setup/auto/route.ts — แก้ lines 149-158
const { error: subError } = await admin.from('billing_subscriptions').insert({
  stripe_subscription_id: `placeholder_trial_${orgId}`,
  stripe_customer_id: `placeholder_cus_${orgId}`,
  org_id: orgId,
  customer_email: `setup@${orgId}`,
  status: 'trialing',
  plan_key: 'trial',
  billing_interval: 'monthly',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 14 * 86400_000).toISOString(),
  metadata: { is_placeholder: true, source: 'auto_setup' },
});
```

แล้วใน webhook route (`app/api/billing/webhook/route.ts`) เพิ่ม cleanup:

```typescript
// ใน case 'checkout.session.completed' — หลัง upsertBillingCustomer:
// ลบ placeholder subscription ถ้ามี
await supabase
  .from('billing_subscriptions')
  .delete()
  .eq('org_id', orgId)
  .like('stripe_subscription_id', 'placeholder_%');
```

**เทส:** รัน auto-setup → ดู billing_subscriptions → ต้องเห็น `placeholder_` prefix → จ่ายเงินจริงผ่าน Stripe → placeholder ต้องถูกลบ

---

## Fix 7: CSP block Stripe + remote DSG Core (Medium)

**ไฟล์:** `next.config.js`
**ปัญหา:** Line 40 — `connect-src 'self' https://*.supabase.co` ไม่มี Stripe domains และ DSG Core URL → browser จะ block fetch ไป Stripe checkout และ remote core

**แก้:**

```javascript
// next.config.js — แก้ line 40
const dsgCoreUrl = process.env.DSG_CORE_URL?.replace(/\/$/, '') || '';
const dsgCoreDomain = dsgCoreUrl ? (() => { try { return new URL(dsgCoreUrl).origin; } catch { return ''; } })() : '';
const connectSrc = [
  "'self'",
  'https://*.supabase.co',
  'https://api.stripe.com',
  'https://checkout.stripe.com',
  dsgCoreDomain,
].filter(Boolean).join(' ');

// ใน headers:
{ key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connectSrc}; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'` },
```

**เทส:** เปิด browser DevTools → Console → ต้องไม่เห็น CSP violation errors เมื่อกด checkout หรือเรียก remote core

---

## Fix 8: Audit matrix integration ยังไม่เสร็จ (Low)

**ไฟล์ที่ต้องแก้:** ตาม `docs/agent-handoff-audit-matrix.md`

**Task 8a:** `lib/dsg-core/index.ts` — ตอนนี้ `getDSGCoreAuditEvents()` และ `getDSGCoreDeterminism()` มี export แล้ว (lines 82-95) ✅ ไม่ต้องแก้

**Task 8b:** `app/dashboard/audit/matrix/page.tsx` — ตอนนี้ fetch `/api/audit/matrix?limit=100` แล้ว (line 83) ✅ ไม่ต้องแก้

**Task 8c:** `app/dashboard/audit/page.tsx` — มี link ไป `/dashboard/audit/matrix` แล้ว (lines 95-99) ✅ ไม่ต้องแก้

**Task 8d:** `app/dashboard/page.tsx` — ยังไม่มี Audit entry point → เพิ่ม:

```typescript
// app/dashboard/page.tsx — เพิ่ม Audit card ใน dashboard grid
<Link href="/dashboard/audit" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-600 transition">
  <p className="text-sm text-slate-400">Audit Layer</p>
  <p className="mt-2 text-lg font-semibold">View audit events, entropy matrix, and determinism checks</p>
</Link>
```

แล้วอัปเดต `docs/agent-handoff-audit-matrix.md` ให้ mark tasks 1-3 เป็น done

**เทส:** เปิด `/dashboard` → ต้องเห็น Audit card → กดแล้วไปหน้า audit

---

## Fix 9: React 18.2.0 + Next.js 15.x version mismatch (Low)

**ไฟล์:** `package.json`
**ปัญหา:** `react: "18.2.0"` + `next: "^15.5.15"` — Next.js 15 designed for React 19, บาง feature อาจไม่ทำงานถูกต้อง

**แก้ (ทางเลือก A — safe):** Pin Next.js ไม่ให้เกิน 14.x

```json
"next": "^14.2.0"
```

**แก้ (ทางเลือก B — forward):** Upgrade React to 19

```bash
npm install react@19 react-dom@19 @types/react@19
```

แล้วเทส `npm run build` + `npm run typecheck` ว่าไม่พัง

**เทส:** `npm run build` → ต้องไม่มี React version warning

---

## Fix 10: onboarding/seed ใช้ console.error สำหรับ non-fatal errors (Low)

**ไฟล์:** `app/api/onboarding/seed/route.ts`
**ปัญหา:** Lines 93, 110, 126, 139 ใช้ `console.error()` ตรงๆ สำหรับ non-fatal errors (audit_log, usage_event, usage_counter insert failures) — ไม่ผ่าน `logApiError()` ทำให้ Sentry (ถ้าเพิ่มจาก Fix 3) จะไม่จับ errors เหล่านี้

**แก้:** เปลี่ยนเป็น `logApiError()`

```typescript
// app/api/onboarding/seed/route.ts
import { logApiError } from '../../../../lib/security/api-error';

// Line 93: แทน console.error
if (execError) {
  logApiError('api/onboarding/seed', execError, { stage: 'execution_insert', agent_id: agentId });
  await admin.from('agents').delete().eq('id', agentId);
  throw execError;
}

// Line 110:
if (auditError) {
  logApiError('api/onboarding/seed', auditError, { stage: 'audit_log' });
}

// Line 126:
if (usageEventError) {
  logApiError('api/onboarding/seed', usageEventError, { stage: 'usage_event' });
}

// Line 139:
if (counterError) {
  logApiError('api/onboarding/seed', counterError, { stage: 'usage_counter' });
}
```

**เทส:** `npm run lint` + `npm run typecheck` ผ่าน, Sentry จับ errors ได้

---

## Checklist รวม

```
Critical:
☐ Fix 1: middleware.ts — block dashboard เมื่อ env ขาด (return 503)
☐ Fix 2: ตั้ง Upstash Redis หรือเพิ่ม warning log

High:
☐ Fix 3: เพิ่ม Sentry ใน api-error.ts + ตั้ง SENTRY_DSN

Medium:
☐ Fix 4: health route เพิ่ม DB ping
☐ Fix 5: mcp/call เรียก engine ตรงแทน fetch ตัวเอง
☐ Fix 6: auto-setup ใช้ placeholder_ prefix + webhook cleanup
☐ Fix 7: next.config.js เพิ่ม Stripe + DSG Core ใน CSP

Low:
☐ Fix 8d: dashboard page เพิ่ม Audit entry point
☐ Fix 9: แก้ React/Next version mismatch
☐ Fix 10: onboarding/seed ใช้ logApiError() แทน console.error()
```

## Verify หลังแก้ทั้งหมด

```bash
npm run typecheck
npm run lint
npm test
npm run build

# Deploy
vercel --prod

# Smoke
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
# ต้องเห็น: { ok: true, core_ok: true, db_ok: true }
```

## Key Files Reference

| ไฟล์ | Fix # |
|---|---|
| `middleware.ts` | 1 |
| `lib/security/rate-limit.ts` | 2 |
| `lib/security/api-error.ts` | 3, 10 |
| `app/api/health/route.ts` | 4 |
| `app/api/mcp/call/route.ts` | 5 |
| `app/api/setup/auto/route.ts` | 6 |
| `app/api/billing/webhook/route.ts` | 6 |
| `next.config.js` | 7 |
| `app/dashboard/page.tsx` | 8d |
| `docs/agent-handoff-audit-matrix.md` | 8 |
| `package.json` | 9 |
| `app/api/onboarding/seed/route.ts` | 10 |
```
