import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

// ERROR_HANDLER_EXEMPT — this route uses internalErrorMessage directly

type Session = {
  declared_actions: string[];
  declared_at: number;
  ttl_ms: number;
  stamp_count: number;
};

// In-memory session store for demo only — not for production use
const sessions = new Map<string, Session>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min
const INSPECTION_DEADLINE_MS = 5 * 1000; // each action must be inspected within 5s (simulated)

// Patterns that are always blocked regardless of declaration
const BLOCKED_PATTERNS = [
  'delete all', 'drop table', 'truncate', 'rm -rf', 'format disk',
  'bypass', 'override policy', 'ignore policy', 'skip review', 'skip audit',
  'admin override', 'root access', 'sudo', 'disable logging', 'disable audit',
  'exfiltrate', 'steal', 'leak data', 'unauthorized',
  'without approval', 'backdoor', 'jailbreak',
];

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.declared_at > s.ttl_ms) sessions.delete(id);
  }
}

function stamp(sessionId: string, count: number): string {
  const raw = `${sessionId}:${count}:${Date.now()}`;
  return 'DSG-' + createHash('sha256').update(raw).digest('hex').slice(0, 12).toUpperCase();
}

function hasBlockedPattern(action: string): string | null {
  const lower = action.toLowerCase();
  return BLOCKED_PATTERNS.find(p => lower.includes(p)) ?? null;
}

function matchesDeclared(action: string, declared: string[]): boolean {
  const aLow = action.toLowerCase();
  return declared.some(d => {
    const dLow = d.toLowerCase();
    if (aLow.includes(dLow) || dLow.includes(aLow)) return true;
    // Word-level overlap (3+ char words)
    const aWords = new Set(aLow.split(/\W+/).filter(w => w.length >= 3));
    const dWords = dLow.split(/\W+/).filter(w => w.length >= 3);
    return dWords.some(w => aWords.has(w));
  });
}

export async function POST(request: Request) {
  const rl = await applyRateLimit({
    key: getRateLimitKey(request, 'try-gate'),
    limit: 60,
    windowMs: 60_000,
  });
  const rlHeaders = buildRateLimitHeaders(rl, 60);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers: rlHeaders });
  }

  try {
    cleanupExpiredSessions();

    const body = await request.json().catch(() => null) as {
      session_id?: string;
      declared_actions?: string[];
      action?: string;
      ttl_minutes?: number;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 }, );
    }

    const sessionId = typeof body.session_id === 'string' && body.session_id.length > 0
      ? body.session_id
      : randomBytes(8).toString('hex');

    const now = Date.now();
    const inspectedAt = new Date(now).toISOString();

    // --- DECLARE phase: register allowed actions ---
    if (Array.isArray(body.declared_actions) && body.declared_actions.length > 0) {
      const ttlMs = typeof body.ttl_minutes === 'number' && body.ttl_minutes > 0
        ? Math.min(body.ttl_minutes, 60) * 60_000
        : SESSION_TTL_MS;

      const declared = body.declared_actions
        .map(a => String(a).trim())
        .filter(a => a.length > 0)
        .slice(0, 20);

      sessions.set(sessionId, {
        declared_actions: declared,
        declared_at: now,
        ttl_ms: ttlMs,
        stamp_count: 0,
      });

      const declarationStamp = stamp(sessionId, 0);

      return NextResponse.json({
        ok: true,
        phase: 'declared',
        session_id: sessionId,
        declaration_stamp: declarationStamp,
        declared_actions: declared,
        declared_at: inspectedAt,
        expires_at: new Date(now + ttlMs).toISOString(),
        ttl_minutes: ttlMs / 60_000,
        message: `${declared.length} action(s) registered. Gate is open for ${ttlMs / 60_000} minutes.`,
      }, { headers: rlHeaders });
    }

    // --- INSPECT phase: evaluate an action ---
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!action) {
      return NextResponse.json({ ok: false, error: 'missing_action' }, { status: 400 });
    }

    const session = sessions.get(sessionId);
    const inspectionStart = now;

    // No session → must declare first
    if (!session) {
      return NextResponse.json({
        ok: false,
        decision: 'BLOCK',
        reason: 'NO_DECLARATION',
        reason_th: 'ไม่มีการประกาศสิทธิ์ก่อน — ต้องแจ้ง action ที่อนุญาตก่อนเข้าด่าน',
        action,
        inspected_at: inspectedAt,
        duration_ms: Date.now() - inspectionStart,
        stamp: null,
      }, { headers: rlHeaders });
    }

    // Session expired
    const age = now - session.declared_at;
    if (age > session.ttl_ms) {
      sessions.delete(sessionId);
      return NextResponse.json({
        ok: false,
        decision: 'BLOCK',
        reason: 'SESSION_EXPIRED',
        reason_th: `ใบอนุญาตหมดอายุ — ผ่านมา ${Math.round(age / 60000)} นาที เกินกว่าที่แจ้งไว้ ${session.ttl_ms / 60000} นาที`,
        action,
        inspected_at: inspectedAt,
        duration_ms: Date.now() - inspectionStart,
        stamp: null,
        expired_after_minutes: Math.round(age / 60000),
      }, { headers: rlHeaders });
    }

    // Bad intent check (always blocked)
    const badPattern = hasBlockedPattern(action);
    if (badPattern) {
      return NextResponse.json({
        ok: false,
        decision: 'BLOCK',
        reason: 'INTENT_VIOLATION',
        reason_th: `เจตนาต้องห้าม — ตรวจพบ "${badPattern}" ซึ่งขัดกับนโยบาย ไม่อนุญาตแม้จะแจ้งไว้`,
        action,
        matched_pattern: badPattern,
        inspected_at: inspectedAt,
        duration_ms: Date.now() - inspectionStart,
        stamp: null,
      }, { headers: rlHeaders });
    }

    // Check declared match
    const allowed = matchesDeclared(action, session.declared_actions);
    if (!allowed) {
      return NextResponse.json({
        ok: false,
        decision: 'BLOCK',
        reason: 'NOT_DECLARED',
        reason_th: 'Action นี้ไม่ได้แจ้งไว้ตอนประกาศ — ต้องเรียก tool ใหม่และรอตรวจก่อน',
        action,
        declared_actions: session.declared_actions,
        inspected_at: inspectedAt,
        duration_ms: Date.now() - inspectionStart,
        stamp: null,
        hint: 'Create a new declaration that includes this action.',
      }, { headers: rlHeaders });
    }

    // PASS — stamp and record
    session.stamp_count += 1;
    const actionStamp = stamp(sessionId, session.stamp_count);
    const durationMs = Date.now() - inspectionStart;
    const remainingMs = session.ttl_ms - age;

    return NextResponse.json({
      ok: true,
      decision: 'ALLOW',
      reason: 'DECLARED_AND_VALID',
      reason_th: 'Action ตรงกับที่แจ้งไว้ อยู่ในช่วงเวลาที่กำหนด — ประทับตราและอนุญาต',
      action,
      stamp: actionStamp,
      stamp_number: session.stamp_count,
      inspected_at: inspectedAt,
      duration_ms: durationMs,
      session_age_minutes: Math.round(age / 60000),
      remaining_minutes: Math.round(remainingMs / 60000),
      declared_actions: session.declared_actions,
    }, { headers: rlHeaders });

  } catch (err) {
    logApiError('api/try/gate', err, {});
    return NextResponse.json({ ok: false, error: internalErrorMessage() }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as { session_id?: string } | null;
  const sessionId = body?.session_id;
  if (sessionId) sessions.delete(sessionId);
  return NextResponse.json({ ok: true });
}
