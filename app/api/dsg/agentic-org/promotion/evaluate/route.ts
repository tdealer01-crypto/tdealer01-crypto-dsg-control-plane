import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ImprovementCandidateEnvelope } from '@/lib/agent-governance/agentic-org/contracts';
import {
  evaluateRawPromotionPacket,
  type CinemaEnvelopeBindingProof,
  type CinemaRawEvidenceProof,
} from '@/lib/agent-governance/agentic-org/promotion-packet';

export const dynamic = 'force-dynamic';

interface PromotionEvaluationBody {
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>;
  structuralProof: CinemaEnvelopeBindingProof;
  rawProof: CinemaRawEvidenceProof;
  evaluatedAt?: string;
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const supplied = header.replace(/^sha256=/i, '').trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(supplied, expected);
}

function isPromotionEvaluationBody(value: unknown): value is PromotionEvaluationBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return Boolean(body.envelope && body.structuralProof && body.rawProof);
}

export async function POST(request: NextRequest) {
  const secret = process.env.DSG_PROMOTION_EVALUATION_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'PROMOTION_EVALUATION_NOT_CONFIGURED',
      missing: [
        ...(!secret ? ['DSG_PROMOTION_EVALUATION_SECRET'] : []),
        ...(!supabaseUrl ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
        ...(!serviceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
      ],
    }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-dsg-signature'), secret)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_EVALUATION_SIGNATURE_INVALID' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_EVALUATION_INVALID_JSON' }, { status: 400 });
  }
  if (!isPromotionEvaluationBody(parsed)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_EVALUATION_PAYLOAD_INVALID' }, { status: 400 });
  }

  let result;
  try {
    result = evaluateRawPromotionPacket(
      parsed.envelope,
      parsed.structuralProof,
      parsed.rawProof,
      parsed.evaluatedAt,
    );
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_EVALUATION_FAILED' }, { status: 400 });
  }

  if (!result.receipt || result.gate?.verdict !== 'ALLOW' || !result.rawEvidenceVerified || !result.rawBinding?.ok) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'PROMOTION_NOT_ALLOWED',
      gate: result.gate,
      rawEvidenceVerified: result.rawEvidenceVerified,
      structuralBinding: result.structuralBinding,
      rawBinding: result.rawBinding,
      receipt: null,
    }, { status: 409 });
  }

  const receipt = result.receipt;
  const envelope = result.rawBinding.envelope;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: lookupError } = await supabase
    .from('agentic_promotion_receipts')
    .select('promotion_id,promotion_hash,target_repository,baseline_commit,candidate_commit,receipt_payload')
    .eq('promotion_id', receipt.promotionId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_RECEIPT_LOOKUP_FAILED' }, { status: 503 });
  }

  if (existing) {
    const same = existing.promotion_hash === receipt.promotionHash &&
      existing.target_repository === receipt.targetRepository &&
      existing.baseline_commit === receipt.baselineCommit &&
      existing.candidate_commit === receipt.candidateCommit;
    if (!same) {
      return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_RECEIPT_CONFLICT' }, { status: 409 });
    }
    return NextResponse.json({
      status: 'PASS',
      reason: 'PROMOTION_ALREADY_ALLOWED',
      gate: result.gate,
      receipt: existing.receipt_payload,
      persisted: true,
    });
  }

  const { error: insertError } = await supabase.from('agentic_promotion_receipts').insert({
    promotion_id: receipt.promotionId,
    promotion_hash: receipt.promotionHash,
    target_repository: receipt.targetRepository,
    candidate_id: envelope.candidateId,
    goal_id: envelope.goalId,
    approved_plan_hash: envelope.approvedPlanHash,
    baseline_commit: receipt.baselineCommit,
    candidate_commit: receipt.candidateCommit,
    cinema_proof_id: envelope.cinemaProof?.proofId,
    cinema_proof_hash: envelope.cinemaProof?.proofHash,
    gate_evaluated_at: result.gate.evaluatedAt,
    metric_delta: result.gate.metricDelta,
    receipt_payload: receipt,
  });

  if (insertError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_RECEIPT_PERSIST_FAILED' }, { status: 503 });
  }

  return NextResponse.json({
    status: 'PASS',
    reason: 'PROMOTION_ALLOWED_AND_RECEIPT_PERSISTED',
    gate: result.gate,
    receipt,
    persisted: true,
  });
}
