import { NextResponse } from 'next/server';
import { evaluateHarmonicGate } from '@/lib/runtime/harmonic-gate';
import { buildMakk8ActionData } from '@/lib/makk8/action-data';
import type { Signal, Profile } from '@/lib/harmonic-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dsg/evaluate
 *
 * Evaluates signals through the two-stage gate:
 *   1. Harmonic Engine (< 1ms) — UNITY / TUNING / CHAOS
 *   2. Makk-8 Z3 arbiter — SAMMA / PATH_CONFLICT (skipped if CHAOS)
 *
 * Body:
 *   signals  — array of { name, value (0–1), weight (0–1) }
 *   profile  — 'conservative' | 'balanced' | 'aggressive' | 'strict'  (default: balanced)
 *   context  — optional action context for Makk-8 (intent_score, source_verified, …)
 *
 * Use cases: AI agent safety gate, trading bot, LLM output validation.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { signals, profile, context } = body as {
    signals?: unknown;
    profile?: unknown;
    context?: Record<string, unknown>;
  };

  if (!Array.isArray(signals) || signals.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'signals must be a non-empty array of { name, value, weight }' },
      { status: 400 }
    );
  }

  const validSignals: Signal[] = [];
  for (const s of signals) {
    if (
      typeof s !== 'object' || s === null ||
      typeof (s as Signal).value !== 'number' ||
      typeof (s as Signal).weight !== 'number'
    ) {
      return NextResponse.json(
        { ok: false, error: 'Each signal must have { name: string, value: number, weight: number }' },
        { status: 400 }
      );
    }
    validSignals.push({
      name: String((s as Signal).name ?? 'signal'),
      value: Math.max(0, Math.min(1, (s as Signal).value)),
      weight: Math.max(0, Math.min(1, (s as Signal).weight)),
    });
  }

  const validProfile: Profile = (['conservative', 'balanced', 'aggressive', 'strict'] as Profile[])
    .includes(profile as Profile)
    ? (profile as Profile)
    : 'balanced';

  const actionData = buildMakk8ActionData(
    context ?? {},
    context ?? {}
  );

  const result = evaluateHarmonicGate({
    signals: validSignals,
    actionData,
    profile: validProfile,
  });

  return NextResponse.json({
    ok: true,
    allow_execute: result.allow_execute,
    phase: result.phase,
    reason: result.reason,
    harmonic: {
      confidence: result.harmonic.confidence,
      entropy: result.harmonic.entropy,
      phase: result.harmonic.phase,
    },
    makk8: result.makk8
      ? { ok: result.makk8.ok, reason: result.makk8.reason }
      : null,
    profile: validProfile,
    timestamp: result.harmonic.timestamp,
  });
}

/**
 * GET /api/dsg/evaluate
 * Returns schema/docs for the endpoint.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/dsg/evaluate',
    description: 'Two-stage DSG gate: Harmonic Engine (signal coherence) → Makk-8 Z3 (formal path verification)',
    profiles: {
      conservative: 'threshold=0.90 — financial, medical, critical systems',
      balanced:     'threshold=0.75 — general AI agents, chatbots (default)',
      aggressive:   'threshold=0.60 — creative AI, experimental systems',
      strict:       'threshold=0.95 — autonomous vehicles, critical infrastructure',
    },
    example_body: {
      profile: 'balanced',
      signals: [
        { name: 'confidence',  value: 0.85, weight: 1.0 },
        { name: 'coherence',   value: 0.78, weight: 1.0 },
        { name: 'safety',      value: 0.92, weight: 1.5 },
      ],
      context: {
        intent_score: 8,
        source_verified: true,
        is_grounded: true,
        is_api_clean: true,
        compute_cost: 50,
        has_audit_trail: true,
        nonce_lock: true,
      },
    },
    use_cases: [
      'AI Agent Safety Gate — pass agent context signals before executing actions',
      'Trading Bot — pass market_confidence, risk_score, liquidity, volatility',
      'LLM Output Validation — pass confidence, coherence, factuality, safety',
    ],
  });
}
