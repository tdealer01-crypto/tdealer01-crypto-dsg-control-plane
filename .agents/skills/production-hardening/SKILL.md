# Production Hardening — Auto-Fix All 20 Issues

## Repository
- **Repo:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- **Branch:** create `fix/production-hardening` from `main`

## Overview
แก้ไข 20 ปัญหาที่พบจาก production audit ครอบคลุม security, reliability, type safety, error handling, และ incomplete features.
ทุกไฟล์ที่แก้ต้องผ่าน `npm run typecheck` และ `npm run lint` ก่อน commit.

---

## CRITICAL FIXES (ต้องทำก่อน — ไม่ทำ = production ไม่ปลอดภัย)

### Fix #1: Middleware bypass เมื่อ env ขาด
**File:** `middleware.ts` (lines 17-19)

**ปัญหา:** ถ้า `NEXT_PUBLIC_SUPABASE_URL` หรือ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ไม่มี middleware จะ `return response` ตรงๆ — ปล่อยให้ทุก request เข้า dashboard ได้โดยไม่ต้อง login.

**แก้:** เปลี่ยน lines 17-19 จาก:
```ts
if (!url || !key) {
  return response;
}
```
เป็น:
```ts
if (!url || !key) {
  if (isDashboardPath(request.nextUrl.pathname)) {
    return new NextResponse('Service Unavailable — auth configuration missing', { status: 503 });
  }
  if (request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.pathname !== '/api/health') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  return response;
}
```

**ผลลัพธ์:** Dashboard และ API routes (ยกเว้น `/api/health`) จะ return 503 แทนที่จะปล่อยผ่าน.

---

### Fix #2: Rate limit log warning เมื่อ fallback ไป in-memory
**File:** `lib/security/rate-limit.ts` (lines 77-91)

**ปัญหา:** บน Vercel serverless ทุก invocation ได้ `Map` ใหม่ — rate limit ไม่ทำงานจริง. ไม่มี log ว่า fallback.

**แก้:** เพิ่ม warning log ใน `applyRateLimit()`:
```ts
export async function applyRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const prefix = options.key.split(':')[0] || 'default';
  const limiter = getLimiter(prefix, options.limit, options.windowMs);

  if (!limiter) {
    if (!warnedNoRedis) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to in-memory rate limiting (ineffective on serverless)');
      warnedNoRedis = true;
    }
    return applyMemoryRateLimit(options);
  }

  try {
    const { success, remaining, reset } = await limiter.limit(options.key);
    return { allowed: success, remaining, resetAt: reset };
  } catch (err) {
    console.warn('[rate-limit] Redis error, falling back to in-memory:', err instanceof Error ? err.message : 'unknown');
    return applyMemoryRateLimit(options);
  }
}
```

เพิ่มตัวแปร `let warnedNoRedis = false;` หลัง line 18 (`const MAX_MEM_BUCKETS = 10_000;`).

แก้ `as any` ที่ line 63:
```ts
// เปลี่ยนจาก:
limiter: Ratelimit.fixedWindow(limit, windowSec as any),
// เป็น:
limiter: Ratelimit.fixedWindow(limit, windowSec as `${number} s`),
```

---

### Fix #3: Password login ไม่มี rate limit (brute force vulnerability)
**File:** `app/auth/password-login/route.ts` (lines 1-38)

**ปัญหา:** Route นี้ไม่มี rate limit เลย — attacker สามารถ brute force password ได้ไม่จำกัด. เทียบกับ `auth/continue/route.ts` ที่มี double rate limit (IP + email).

**แก้:** เพิ่ม rate limit แบบเดียวกับ `auth/continue`.

---

## HIGH PRIORITY FIXES

### Fix #4: Health endpoint ไม่เช็ค Supabase DB
**File:** `app/api/health/route.ts` (lines 19-40)

### Fix #5: MCP call route fetches itself (self-fetch on serverless)
**File:** `app/api/mcp/call/route.ts` (lines 43-68)

---

## MEDIUM PRIORITY FIXES

### Fix #6: Auto-setup สร้าง fake Stripe IDs
**File:** `app/api/setup/auto/route.ts` (lines 149-159)

### Fix #7: CSP blocks Stripe JS + remote DSG Core
**File:** `next.config.js` (line 40)

### Fix #8: Audit matrix integration ยังไม่เสร็จ
**Files:**
- `lib/dsg-core/index.ts`
- `app/dashboard/audit/page.tsx`
- `app/dashboard/audit/matrix/page.tsx`
- `app/dashboard/page.tsx`

### Fix #9: `as any` type casts ใน remote.ts
**File:** `lib/dsg-core/remote.ts` (lines 112-118, 151)

### Fix #10: `shouldCreateUser: true` ใน auth/continue
**File:** `app/auth/continue/route.ts` (line 68)

### Fix #11: Onboarding seed ใช้ console.error ตรง
**File:** `app/api/onboarding/seed/route.ts` (lines 93, 110, 126, 139)

### Fix #12: Silent `catch {}` blocks
**Files:**
- `app/auth/continue/route.ts` line 49
- `app/auth/login/route.ts`

### Fix #13: Remote DSG Core leak error message
**File:** `lib/dsg-core/remote.ts` (line 38)

### Fix #14: `supabase-server.ts` ใช้ `createClient<any>`
**File:** `lib/supabase-server.ts` (lines 3, 17)

---

## LOW PRIORITY FIXES

### Fix #15: `auto-setup-env.sh` ไม่มี `--dry-run` flag
**File:** `scripts/auto-setup-env.sh`

**ปัญหา:** ตาม `docs/ops/SCRIPT_GOVERNANCE.md` ทุก production script ต้องมี `--dry-run` หรือ `--confirm` flag.

**แก้:** เพิ่มหลัง `set -euo pipefail`:
```bash
DRY_RUN=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done
```

---

> หมายเหตุ: รายละเอียด Fix #16-#20 ให้เติมต่อจาก audit checklist ฉบับเต็มก่อนใช้งานจริง.
