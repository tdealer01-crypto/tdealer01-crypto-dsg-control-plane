import { NextResponse } from 'next/server';
import { verifyMakk8WithZ3 } from '@/lib/runtime/makk8-z3-verifier';
import type { Makk8ActionData } from '@/lib/runtime/makk8-arbiter';

export const dynamic = 'force-dynamic';

interface VerifyBody {
  context?: Record<string, unknown>;
  timeoutMs?: number;
}

export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const context = body.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return NextResponse.json(
      { ok: false, error: 'CONTEXT_REQUIRED', message: 'context must be a JSON object' },
      { status: 400 },
    );
  }

  const parsed = parseStrictActionData(context);
  if ('missing' in parsed) {
    return NextResponse.json(
      {
        ok: false,
        decision: 'BLOCK',
        error: 'MAKK8_CONTEXT_INCOMPLETE',
        missing: parsed.missing,
        message: 'Makk-8 formal verification is fail-closed: all required action facts must be supplied explicitly.',
      },
      { status: 400 },
    );
  }

  const timeoutMs = clampTimeout(body.timeoutMs);
  const result = await verifyMakk8WithZ3(parsed.actionData, timeoutMs);

  return NextResponse.json(
    {
      ok: result.ok,
      decision: result.decision,
      makk8: result,
      boundary: {
        statement: result.ok
          ? 'The supplied Makk-8 facts were satisfiable under the eight-invariant Z3 model. This is an execution precondition, not execution permission by itself.'
          : 'The supplied facts did not produce an ALLOW result. The caller must not execute based on this verification.',
        requiresAgentCommandGate: true,
      },
    },
    { status: result.ok ? 200 : 409 },
  );
}

function parseStrictActionData(context: Record<string, unknown>):
  | { ok: true; actionData: Makk8ActionData }
  | { ok: false; missing: string[] } {
  const requiredBooleans = [
    'is_grounded',
    'is_api_clean',
    'source_verified',
    'has_audit_trail',
    'nonce_lock',
  ] as const;
  const requiredNumbers = ['value', 'intent_score', 'compute_cost'] as const;
  const missing: string[] = [];

  for (const key of requiredBooleans) {
    if (typeof context[key] !== 'boolean') missing.push(key);
  }
  for (const key of requiredNumbers) {
    if (typeof context[key] !== 'number' || !Number.isFinite(context[key] as number)) missing.push(key);
  }

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    actionData: {
      is_grounded: context.is_grounded as boolean,
      is_api_clean: context.is_api_clean as boolean,
      source_verified: context.source_verified as boolean,
      has_audit_trail: context.has_audit_trail as boolean,
      nonce_lock: context.nonce_lock as boolean,
      value: context.value as number,
      intent_score: context.intent_score as number,
      compute_cost: context.compute_cost as number,
    },
  };
}

function clampTimeout(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5_000;
  return Math.min(10_000, Math.max(100, Math.floor(value)));
}
