import { NextResponse } from 'next/server';
import { evaluateGate, detectOscillation } from '../../../../lib/runtime/gate';
import { canonicalHash } from '../../../../lib/runtime/canonical';
import {
  applyRateLimit,
  getRateLimitKey,
  buildRateLimitHeaders,
} from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const PLAYGROUND_RATE_LIMIT = 30;
const PLAYGROUND_RATE_WINDOW_MS = 60 * 1000;

type PlaygroundPayload = {
  risk_score?: unknown;
  recent_risk_scores?: unknown;
  action?: unknown;
  context?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const startedAt = performance.now();
  const rate = await applyRateLimit({
    key: getRateLimitKey(request, 'playground'),
    limit: PLAYGROUND_RATE_LIMIT,
    windowMs: PLAYGROUND_RATE_WINDOW_MS,
  });

  const rateLimitHeaders = buildRateLimitHeaders(rate, PLAYGROUND_RATE_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

  const payload = (await request.json().catch(() => null)) as PlaygroundPayload | null;
  const riskScore = payload?.risk_score;
  const recentRiskScores = payload?.recent_risk_scores;
  const action = typeof payload?.action === 'string' ? payload.action : 'playground_eval';

  if (typeof riskScore !== 'number' || Number.isNaN(riskScore) || riskScore < 0 || riskScore > 1) {
    return NextResponse.json(
      { error: 'risk_score must be a number between 0 and 1' },
      {
        status: 400,
        headers: rateLimitHeaders,
      }
    );
  }

  const normalizedRecentRiskScores = Array.isArray(recentRiskScores)
    ? recentRiskScores.filter((score): score is number => typeof score === 'number' && !Number.isNaN(score))
    : [];

  const { decision, reason } = evaluateGate({
    riskScore,
    recentRiskScores: normalizedRecentRiskScores,
  });

  const oscillationDetected = detectOscillation(normalizedRecentRiskScores);
  const evaluatedAt = new Date().toISOString();
  const proofHash = canonicalHash({
    risk_score: riskScore,
    recent_risk_scores: normalizedRecentRiskScores,
    action,
    decision,
    reason,
    timestamp: evaluatedAt,
  });
  const evaluatedAtMs = performance.now();
  const totalLatencyMs = Number((evaluatedAtMs - startedAt).toFixed(2));

  return NextResponse.json(
    {
      decision,
      reason,
      risk_score: riskScore,
      oscillation_detected: oscillationDetected,
      proof_hash: proofHash,
      policy: {
        block_threshold: 0.8,
        stabilize_threshold: 0.4,
        oscillation_window: 4,
        oscillation_spread: 0.35,
      },
      metrics: {
        total_latency_ms: totalLatencyMs,
      },
      evaluated_at: evaluatedAt,
    },
    { headers: rateLimitHeaders }
  );
}
