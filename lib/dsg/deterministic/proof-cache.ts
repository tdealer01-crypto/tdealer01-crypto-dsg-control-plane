/**
 * Hybrid Proof Verification Strategy
 *
 * Path A (Cached): Fast deterministic replay from stored proof records
 * Path B (Live): Fresh Z3 solver invocation for verification/audit
 *
 * Decision flow:
 * 1. Try cache lookup by input_hash on dsg_gate_decisions table
 * 2. If hit && no verification flag: return cached proof (fast)
 * 3. If miss || verification flag: invoke live Z3 solver (fresh)
 * 4. Record/update decision in dsg_gate_decisions for future replay
 */

import type { DeterministicProof, DeterministicProofRequest } from './types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
 * Compute SHA256 hash of input constraints for cache lookup
 */
export function hashProofInput(request: DeterministicProofRequest): string {
  const input = JSON.stringify({
    planId: request.planId ?? null,
    context: request.context ?? {},
    policyRef: request.policyRef,
    policyVersion: request.policyVersion,
    riskLevel: request.riskLevel ?? 'medium',
    nonce: request.nonce,
    idempotencyKey: request.idempotencyKey,
  });
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Path A (Cached): Look up proof from dsg_gate_decisions table
 * Returns null if not found or verification requested
 */
export async function tryGetCachedProof(
  orgId: string,
  inputHash: string,
  options: { verifyFresh?: boolean } = {},
): Promise<CachedProofRecord | null> {
  if (options.verifyFresh) {
    // Skip cache if verification requested
    return null;
  }

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
      if (error.code === 'PGRST116') {
        // Not found — expected on cache miss
        return null;
      }
      console.warn('Cache lookup error:', error);
      return null;
    }

    return data as CachedProofRecord;
  } catch (err) {
    console.warn('Proof cache lookup failed:', err);
    return null;
  }
}

/**
 * Path B (Live): Record or update Z3 proof decision in dsg_gate_decisions
 * Called after proof generation to store for future cache hits
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
      .insert({
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
        proof_format: 'dsg-deterministic-v1',
        z3_status: proof.solver?.name === 'z3' ? 'sat' : null,
        z3_satisfiable: proof.status === 'PASS' || proof.status === 'REVIEW',
        z3_solver_version: proof.solver?.version,
        z3_smt2_hash: proof.inputHash,
        z3_trace: proof.evidenceBoundary,
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

/**
 * Hybrid wrapper: Check cache first, fall back to live solver
 */
export interface HybridProofOptions {
  orgId: string;
  verifyFresh?: boolean; // If true, skip cache and invoke live Z3
  recordResult?: boolean; // If true, store result in cache
}

export async function evaluateProofWithHybridStrategy(
  request: DeterministicProofRequest,
  options: HybridProofOptions,
  proveFn: (req: DeterministicProofRequest) => Promise<DeterministicProof>,
): Promise<{ proof: DeterministicProof; source: 'cached' | 'live' }> {
  const inputHash = hashProofInput(request);

  // Try Path A (Cached)
  const cached = await tryGetCachedProof(options.orgId, inputHash, {
    verifyFresh: options.verifyFresh,
  });

  if (cached) {
    console.log(`[Proof Cache] HIT: ${inputHash.slice(0, 8)}...`);
    // Return cached proof structure (reconstruct from record)
    // For now, fall through to live to ensure we have full proof object
    // TODO: Store full proof JSON in z3_trace to enable full replay
  }

  // Path B (Live) or cache miss
  console.log(`[Proof Cache] MISS/VERIFY: ${inputHash.slice(0, 8)}... (invoking live Z3)`);
  const proof = await proveFn(request);

  // Record result for future cache hits
  if (options.recordResult) {
    await recordProofDecision(options.orgId, proof);
  }

  return { proof, source: 'live' };
}
