// DSG Gate — trial gate with agent feedback on BLOCK.
// Production hardening: Redis-backed sessions, signed stamps, bounded JSON,
// optional public-trial mode, and explicit production secrets.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { readJsonBody } from '../../../../lib/security/request-json';
import { verifyBearerSecret } from '../../../../lib/security/secure-token';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 16_000;
const SESSION_KEY_PREFIX = 'try-gate:session:';
const AUDIT_KEY_PREFIX = 'try-gate:audit:';

type Session = {
  session_id: string;
  declared_actions: string[];
  expires_at: number;
  stamps: string[];
  blocked_count: number;
  created_at: number;
};

type AuditEntry = {
  timestamp_ms: number;
  session_id: string;
  decision: 'ALLOW' | 'BLOCK';
  action?: string;
  reason?: string;
  stamp: string | null;
};

const devSessions = new Map<string, Session>();
let redis: Redis | null = null;

const BLOCKED_PATTERNS = [
  /delete\s+all/i, /drop\s+table/i, /truncate/i,
  /bypass\s+(policy|auth|gate|security)/i,
  /override\s+(policy|control|gate)/i,
  /rm\s+-rf/i, /format\s+(disk|drive|c:)/i,
  /exfiltrate/i, /steal/i,
];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function json(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function sessionKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function auditKey(sessionId: string) {
  return `${AUDIT_KEY_PREFIX}${sessionId}`;
}

function getStampSecret(): string | null {
  const secret = process.env.DSG_STAMP_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (!isProduction()) return 'dev-only-dsg-stamp-secret-minimum-32-bytes';
  return null;
}

function makeStamp(input: { sessionId: string; action: string; timestamp: number }): string | null {
  const secret = getStampSecret();
  if (!secret) return null;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${input.sessionId}:${input.action}:${input.timestamp}:${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32).toUpperCase();
  return `DSG-${input.timestamp}-${nonce.toUpperCase()}-${signature}`;
}

function verifyStamp(stamp: string, input: { sessionId: string; action: string }): boolean {
  const secret = getStampSecret();
  if (!secret) return false;
  const parts = stamp.split('-');
  if (parts.length !== 4 || parts[0] !== 'DSG') return false;
  const [, timestamp, nonce, signature] = parts;
  if (!/^\d+$/.test(timestamp) || !/^[A-F0-9]{16}$/i.test(nonce) || !/^[A-F0-9]{32}$/i.test(signature)) return false;
  const payload = `${input.sessionId}:${input.action}:${timestamp}:${nonce.toLowerCase()}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32).toUpperCase();
  return timingSafeEqual(Buffer.from(signature.toUpperCase()), Buffer.from(expected));
}

async function getSession(sessionId: string): Promise<Session | null> {
  const r = getRedis();
  if (!r) {
    if (isProduction()) throw new Error('redis_session_store_required');
    return devSessions.get(sessionId) ?? null;
  }
  return await r.get<Session>(sessionKey(sessionId));
}

async function setSession(sessionId: string, session: Session, ttlSeconds: number) {
  const r = getRedis();
  if (!r) {
    if (isProduction()) throw new Error('redis_session_store_required');
    devSessions.set(sessionId, session);
    return;
  }
  await r.set(sessionKey(sessionId), session, { ex: ttlSeconds });
}

async function deleteSession(sessionId: string) {
  const r = getRedis();
  if (!r) {
    if (!isProduction()) devSessions.delete(sessionId);
    return;
  }
  await r.del(sessionKey(sessionId));
}

async function appendAudit(entry: AuditEntry, ttlSeconds: number) {
  const r = getRedis();
  if (!r) return;
  const key = auditKey(entry.session_id);
  await r.rpush(key, JSON.stringify(entry));
  await r.expire(key, ttlSeconds);
}

function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 3 && value.length <= 128 && /^[A-Za-z0-9_.:-]+$/.test(value);
}

function parseDeclaredActions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const actions = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 200));
  if (actions.length === 0) return null;
  return Array.from(new Set(actions));
}

function parseTtlMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 30;
  return Math.max(1, Math.min(Math.trunc(value), 120));
}

function parseAction(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const action = value.trim().slice(0, 500);
  return action ? action : null;
}

function authorizeTryGate(request: Request): NextResponse | null {
  if (process.env.DSG_TRY_GATE_PUBLIC_TRIAL === 'true') return null;

  const configured = Boolean(process.env.DSG_TRY_GATE_API_KEY || process.env.DSG_TRY_GATE_API_KEY_SHA256);
  if (!configured) {
    if (isProduction()) {
      return json('try_gate_auth_required', 503, { 'Cache-Control': 'no-store' });
    }
    return null;
  }

  if (!verifyBearerSecret(request, {
    expected: process.env.DSG_TRY_GATE_API_KEY,
    expectedSha256: process.env.DSG_TRY_GATE_API_KEY_SHA256,
  })) {
    return json('Unauthorized', 401, { 'Cache-Control': 'no-store' });
  }

  return null;
}

function matchesDeclared(action: string, declared: string[]): boolean {
  const words = action.toLowerCase().split(/\s+/);
  return declared.some(d => {
    const dwords = d.toLowerCase().split(/\s+/);
    return dwords.some(dw => words.some(w => w.includes(dw) || dw.includes(w)));
  });
}

function hasBlockedPattern(action: string): string | null {
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(action)) return `Pattern "${p.source}" is permanently blocked regardless of declaration`;
  }
  return null;
}

function buildBlockGuidance(reason: string, session: Session, action: string): object {
  const ttlRemainingMs = Math.max(0, session.expires_at - Date.now());
  const ttlRemainingMin = Math.round(ttlRemainingMs / 60_000);

  const alternatives = session.declared_actions.filter(d => !BLOCKED_PATTERNS.some(p => p.test(d)));

  return {
    decision: 'BLOCK',
    reason,
    blocked_action: action,
    session_state: {
      session_id: session.session_id,
      declared_actions: session.declared_actions,
      stamps_issued: session.stamps.length,
      blocked_count: session.blocked_count,
      ttl_remaining_ms: ttlRemainingMs,
      ttl_remaining_min: ttlRemainingMin,
      expires_at: new Date(session.expires_at).toISOString(),
    },
    agent_guidance: {
      can_proceed_with: alternatives,
      options: [
        alternatives.length > 0
          ? `Proceed with one of your declared actions: ${alternatives.join(', ')}`
          : null,
        'Start a new session with the correct actions declared upfront',
        'Escalate to human review if the blocked action is genuinely required',
        'Stop the current task and report why it cannot be completed',
      ].filter(Boolean),
      suggested_llm_prompt:
        `Your action "${action}" was blocked by DSG Gate: ${reason}. ` +
        `You have ${ttlRemainingMin} minutes left in this session. ` +
        (alternatives.length > 0
          ? `You can still perform: ${alternatives.join(', ')}. Choose an alternative or stop.`
          : 'No alternative declared actions remain. You must stop or start a new session with correct declarations.'),
    },
    audit: {
      stamp: null,
      timestamp_ms: Date.now(),
      session_id: session.session_id,
    },
  };
}

export async function POST(request: Request) {
  const authResponse = authorizeTryGate(request);
  if (authResponse) return authResponse;

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'try-gate'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded', decision: 'BLOCK' }, { status: 429, headers });
  }

  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: MAX_BODY_BYTES });
  if (!parsed.ok) return json(parsed.error, parsed.status, headers);
  const body = parsed.value;

  const sessionId = body.session_id;
  if (!isValidSessionId(sessionId)) return json('session_id invalid or required', 400, headers);

  if (Array.isArray(body.declared_actions)) {
    const declaredActions = parseDeclaredActions(body.declared_actions);
    if (!declaredActions) return json('declared_actions must be a non-empty string array with max 50 items', 400, headers);

    const ttlMin = parseTtlMinutes(body.ttl_minutes);
    const ttlSeconds = ttlMin * 60;
    const timestamp = Date.now();
    const stamp = makeStamp({ sessionId, action: 'declare', timestamp });
    if (!stamp) return json('stamp_secret_required', 503, headers);

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const session: Session = {
      session_id: sessionId,
      declared_actions: declaredActions,
      expires_at: expiresAt,
      stamps: [stamp],
      blocked_count: 0,
      created_at: Date.now(),
    };
    await setSession(sessionId, session, ttlSeconds);
    await appendAudit({ timestamp_ms: timestamp, session_id: sessionId, decision: 'ALLOW', action: 'declare', stamp }, ttlSeconds);

    return NextResponse.json({
      ok: true,
      decision: 'ALLOW',
      declaration_stamp: stamp,
      stamp_verifiable: verifyStamp(stamp, { sessionId, action: 'declare' }),
      session_id: sessionId,
      declared_actions: declaredActions,
      ttl_minutes: ttlMin,
      expires_at: new Date(expiresAt).toISOString(),
      agent_guidance: {
        next_step: 'Call POST /api/try/gate with { session_id, action } before each action you take.',
        reminder: 'Only declared actions will be stamped. Undeclared actions will be BLOCKED with guidance to rethink.',
      },
    }, { headers });
  }

  const action = parseAction(body.action);
  if (action) {
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({
        decision: 'BLOCK',
        reason: 'session_not_found: no active session with this ID',
        agent_guidance: {
          options: ['Call POST /api/try/gate with declared_actions to start a new session'],
          suggested_llm_prompt: `Your session "${sessionId}" was not found or has expired. You must declare a new session before taking any actions.`,
        },
      }, { status: 200, headers });
    }

    if (Date.now() > session.expires_at) {
      await deleteSession(sessionId);
      return NextResponse.json({
        decision: 'BLOCK',
        reason: 'session_expired: TTL exceeded',
        agent_guidance: {
          options: ['Start a new session with POST /api/try/gate and declared_actions'],
          suggested_llm_prompt: 'Your session has expired. You must start a new session with your intended actions declared upfront before proceeding.',
        },
      }, { status: 200, headers });
    }

    const ttlSeconds = Math.max(1, Math.ceil((session.expires_at - Date.now()) / 1000));
    const patternBlock = hasBlockedPattern(action);
    if (patternBlock) {
      session.blocked_count++;
      await setSession(sessionId, session, ttlSeconds);
      await appendAudit({ timestamp_ms: Date.now(), session_id: sessionId, decision: 'BLOCK', action, reason: patternBlock, stamp: null }, ttlSeconds);
      return NextResponse.json(buildBlockGuidance(patternBlock, session, action), { status: 200, headers });
    }

    if (!matchesDeclared(action, session.declared_actions)) {
      session.blocked_count++;
      const reason = `action_not_declared: "${action}" was not in your declared_actions list`;
      await setSession(sessionId, session, ttlSeconds);
      await appendAudit({ timestamp_ms: Date.now(), session_id: sessionId, decision: 'BLOCK', action, reason, stamp: null }, ttlSeconds);
      return NextResponse.json(buildBlockGuidance(reason, session, action), { status: 200, headers });
    }

    const timestamp = Date.now();
    const stamp = makeStamp({ sessionId, action, timestamp });
    if (!stamp) return json('stamp_secret_required', 503, headers);
    session.stamps.push(stamp);
    await setSession(sessionId, session, ttlSeconds);
    await appendAudit({ timestamp_ms: timestamp, session_id: sessionId, decision: 'ALLOW', action, stamp }, ttlSeconds);

    return NextResponse.json({
      decision: 'ALLOW',
      stamp,
      stamp_verifiable: verifyStamp(stamp, { sessionId, action }),
      action,
      session_id: sessionId,
      session_state: {
        stamps_issued: session.stamps.length,
        blocked_count: session.blocked_count,
        ttl_remaining_ms: Math.max(0, session.expires_at - Date.now()),
        declared_actions: session.declared_actions,
      },
      timestamp_ms: timestamp,
    }, { headers });
  }

  if (body.query === 'status') {
    const session = await getSession(sessionId);
    if (!session || Date.now() > session.expires_at) {
      return NextResponse.json({ session_id: sessionId, active: false }, { headers });
    }
    return NextResponse.json({
      active: true,
      session_id: sessionId,
      declared_actions: session.declared_actions,
      stamps_issued: session.stamps.length,
      blocked_count: session.blocked_count,
      ttl_remaining_ms: Math.max(0, session.expires_at - Date.now()),
      expires_at: new Date(session.expires_at).toISOString(),
    }, { headers });
  }

  return json('provide declared_actions (declare), action (inspect), or query: "status"', 400, headers);
}

export async function DELETE(request: Request) {
  const authResponse = authorizeTryGate(request);
  if (authResponse) return authResponse;

  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 4_000 });
  if (!parsed.ok) return json(parsed.error, parsed.status);
  const sessionId = parsed.value.session_id;
  if (isValidSessionId(sessionId)) await deleteSession(sessionId);
  return NextResponse.json({ ok: true, cleared: isValidSessionId(sessionId) });
}
