/**
 * Hybrid Proof Verification Strategy
 *
 * This module currently provides durable decision history plus live proof
 * generation. Cached proof replay is intentionally disabled until full proof
 * JSON is persisted and integrity-checked before reuse.
 */

import type { DeterministicProof, DeterministicProofRequest } from './types';
import { createClient } from '@supabase/supabase-js';
import { hashDeterministicValue } from './proof-hash';

interface CachedProofRecord {
  id: string;
  org_id: string;
  input_hash: string;
  proof_hash: string;
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
  z3_trace: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Compute the canonical request hash used by proof generation and persistence.
 */
export function hashProofInput(request: DeterministicProofRequest): string {
  return hashDeterministicValue({
    planId: request.planId ?? null,
    context: request.context ?? {},
    policyRef: request.policyRef ?? null,
    policyVersion: request.policyVersion ?? null,
    riskLevel: request.riskLevel ?? 'medium',
    verificationMode: request.verificationMode ?? null,
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
  });
}

/**
 * Decision-history lookup only. Do not treat this record as a replayable proof
 * until full proof JSON is stored and verified.
 */
export async function tryGetCachedProof(
  orgId: string,
  inputHash: string,
  options: { verifyFresh?: boolean } = {},
): Promise<CachedProofRecord | null> {
  if (options.verifyFresh) return null;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('dsg_gate_decisions')
      .select('id, org_id, input_hash, proof_hash, decision, z3_trace, created_at')
      .eq('org_id', orgId)
      .eq('input_hash', inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.warn('Decision history lookup error:', error);
      return null;
    }

    return data as CachedProofRecord;
  } catch (err) {
    console.warn('Decision history lookup failed:', err);
    return null;
  }
}

/**
 * Record the exact verified proof decision in dsg_gate_decisions.
 */
export async function recordProofDecision(
  orgId: string,
  proof: DeterministicProof,
  policyVersionId?: string,
): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('dsg_gate_decisions')
      .upsert({
        org_id: orgId,
        policy_version: policyVersionId || proof.policyVersion,
        input_hash: proof.inputHash,
        constraint_set: {
          constraints: proof.constraints,
          policyRef: proof.policyRef,
          constraintSetHash: proof.constraintSetHash,
        },
        decision: proof.status === 'PASS' ? 'ALLOW' :
                 proof.status === 'BLOCK' ? 'BLOCK' : 'REVIEW',
        decision_confidence: proof.status === 'PASS' ? 1.0 : 0.5,
        proof_hash: proof.proofHash,
        proof_format: 'dsg-deterministic-v2',
        z3_status: proof.solver.invoked ? proof.solver.status ?? null : null,
        z3_satisfiable: proof.solver.invoked ? proof.solver.satisfiable ?? null : null,
        z3_solver_version: proof.solver.invoked ? proof.solver.version : null,
        z3_smt2_hash: proof.solver.invoked ? proof.solver.smt2Hash ?? null : null,
        z3_trace: {
          solver: proof.solver,
          evidenceBoundary: proof.evidenceBoundary,
          replayProtection: proof.replayProtection,
        },
      }, {
        onConflict: 'org_id,input_hash,policy_version,proof_hash',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to record proof decision:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn('Proof decision recording failed:', err);
    return null;
  }
}

export interface HybridProofOptions {
  orgId: string;
  verifyFresh?: boolean;
  recordResult?: boolean;
}

export async function evaluateProofWithHybridStrategy(
  request: DeterministicProofRequest,
  options: HybridProofOptions,
  proveFn: (req: DeterministicProofRequest) => Promise<DeterministicProof>,
): Promise<{ proof: DeterministicProof; source: 'live' }> {
  const inputHash = hashProofInput(request);

  const previous = await tryGetCachedProof(options.orgId, inputHash, {
    verifyFresh: options.verifyFresh,
  });

  if (previous) {
    console.log(
      `[Proof History] MATCH: ${inputHash.slice(0, 8)}...; replay disabled pending full-proof verification`,
    );
  }

  const proof = await proveFn(request);

  if (options.recordResult) {
    await recordProofDecision(options.orgId, proof);
  }

  return { proof, source: 'live' };
}
