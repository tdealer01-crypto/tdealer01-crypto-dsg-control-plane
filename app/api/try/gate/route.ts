// DSG Gate — public trial gate with full agent feedback on BLOCK
// Immigration checkpoint: declare → stamp → inspect → rethink if blocked
//
// BLOCK response includes session state + guidance so the agent LLM can
// decide next step without human intervention.

import { NextResponse } from 'next/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

type Session = {
  session_id: string;
  declared_actions: string[];
  expires_at: number;
  stamps: string[];
  blocked_count: number;
  created_at: number;
};

const sessions = new Map<string, Session>();

// Clean expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.expires_at < now) sessions.delete(id);
  }
}, 5 * 60_000);

const BLOCKED_PATTERNS = [
  /delete\s+all/i, /drop\s+table/i, /truncate/i,
  /bypass\s+(policy|auth|gate|security)/i,
  /override\s+(policy|control|gate)/i,
  /rm\s+-rf/i, /format\s+(disk|drive|c:)/i,
  /exfiltrate/i, /steal/i,
];

function makeStamp(): string {
  return `DSG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
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

// Build rich guidance for the agent LLM to rethink after BLOCK
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
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'try-gate'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded', decision: 'BLOCK' }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers });

  const sessionId = typeof body.session_id === 'string' ? body.session_id : null;

  // ── DECLARE: register session with declared actions ──────────────────────────
  if (Array.isArray(body.declared_actions)) {
    if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400, headers });

    const ttlMin = typeof body.ttl_minutes === 'number' ? Math.min(body.ttl_minutes, 120) : 30;
    const declaredActions = (body.declared_actions as unknown[])
      .filter((a): a is string => typeof a === 'string')
      .map(a => a.slice(0, 200));

    if (declaredActions.length === 0) {
      return NextResponse.json({ error: 'declared_actions must be a non-empty string array' }, { status: 400, headers });
    }

    const stamp = makeStamp();
    const expiresAt = Date.now() + ttlMin * 60_000;
    sessions.set(sessionId, {
      session_id: sessionId,
      declared_actions: declaredActions,
      expires_at: expiresAt,
      stamps: [stamp],
      blocked_count: 0,
      created_at: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      decision: 'ALLOW',
      declaration_stamp: stamp,
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

  // ── INSPECT: check a single action ──────────────────────────────────────────
  if (typeof body.action === 'string') {
    if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400, headers });

    const action = body.action.slice(0, 500);
    const session = sessions.get(sessionId);

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
      sessions.delete(sessionId);
      return NextResponse.json({
        decision: 'BLOCK',
        reason: 'session_expired: TTL exceeded',
        agent_guidance: {
          options: ['Start a new session with POST /api/try/gate and declared_actions'],
          suggested_llm_prompt: 'Your session has expired. You must start a new session with your intended actions declared upfront before proceeding.',
        },
      }, { status: 200, headers });
    }

    // Always-block patterns — regardless of declaration
    const patternBlock = hasBlockedPattern(action);
    if (patternBlock) {
      session.blocked_count++;
      return NextResponse.json(
        buildBlockGuidance(patternBlock, session, action),
        { status: 200, headers }
      );
    }

    // Check declared actions
    if (!matchesDeclared(action, session.declared_actions)) {
      session.blocked_count++;
      return NextResponse.json(
        buildBlockGuidance(
          `action_not_declared: "${action}" was not in your declared_actions list`,
          session,
          action
        ),
        { status: 200, headers }
      );
    }

    // ALLOW — stamp and record
    const stamp = makeStamp();
    session.stamps.push(stamp);

    return NextResponse.json({
      decision: 'ALLOW',
      stamp,
      action,
      session_id: sessionId,
      session_state: {
        stamps_issued: session.stamps.length,
        blocked_count: session.blocked_count,
        ttl_remaining_ms: Math.max(0, session.expires_at - Date.now()),
        declared_actions: session.declared_actions,
      },
      timestamp_ms: Date.now(),
    }, { headers });
  }

  // ── STATUS: check session state ──────────────────────────────────────────────
  if (body.query === 'status' && sessionId) {
    const session = sessions.get(sessionId);
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

  return NextResponse.json({ error: 'provide declared_actions (declare), action (inspect), or query: "status"' }, { status: 400, headers });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : null;
  if (sessionId) sessions.delete(sessionId);
  return NextResponse.json({ ok: true, cleared: Boolean(sessionId) });
}
