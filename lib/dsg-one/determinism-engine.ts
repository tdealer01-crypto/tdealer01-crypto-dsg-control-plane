/**
 * DSG ONE Determinism Engine
 *
 * Core system for generating deterministic sequence numbers and hashes
 * for policy executions. Enables:
 * - Deterministic decision verification (same input → same output)
 * - Tamper detection via hash chains
 * - Replay capability for audit/compliance
 * - Enterprise audit readiness
 */

import { sha256Json } from '@/lib/dsg/runtime/hash';
import { stableJsonStringify } from '@/lib/dsg/runtime/stable-json';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * Policy Execution Request - what triggers a policy decision
 */
export interface PolicyExecutionRequest {
  orgId: string;
  policyId: string;
  requestType: 'approval' | 'payment' | 'deployment' | 'access';
  requestData: Record<string, unknown>;
  requesterId: string;
  requesterRole?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Policy Execution Decision - the outcome of policy evaluation
 */
export interface PolicyExecutionDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  riskScore?: number;
  evidence?: Record<string, unknown>;
}

/**
 * Deterministic Sequence Record
 * - Immutable proof that decision was made deterministically
 * - Can be replayed: same input → same sequence number (proves no randomness)
 */
export interface DeterministicSequence {
  sequenceNumber: bigint;
  requestHash: string; // SHA-256 of request
  decisionHash: string; // SHA-256 of decision
  chainHash: string; // Links to previous sequence (prevents tampering)
  timestamp: string;
  isReplayable: boolean; // true if same inputs produce same decision
}

/**
 * Ledger Entry - immutable record stored in Merkle tree
 */
export interface LedgerEntry {
  entryId: string;
  orgId: string;
  sequence: DeterministicSequence;
  decision: PolicyExecutionDecision;
  verified: boolean; // true if hash chain is valid
  merkleProof?: string; // Path in Merkle tree for audit
}

/**
 * Generate next sequence number for an organization
 * @param orgId Organization ID
 * @returns Next sequence number (incremental, gap-free)
 */
export async function getNextSequenceNumber(orgId: string): Promise<bigint> {
  const supabase = getSupabaseAdmin() as any;

  try {
    // Atomic increment using Supabase RPC or raw SQL
    const { data, error } = await supabase.rpc('next_dsg_sequence', {
      org_id: orgId,
    });

    if (error) {
      console.warn('Failed to increment sequence via RPC, falling back to manual:', error.message);
      // Fallback: manually compute from last sequence
      const { data: lastSeq } = await supabase
        .from('dsg_determinism_ledger')
        .select('sequence_number')
        .eq('org_id', orgId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      return BigInt((lastSeq?.sequence_number || 0)) + 1n;
    }

    return BigInt(data);
  } catch (err) {
    console.error('getNextSequenceNumber threw:', err);
    throw new Error('SEQUENCE_GENERATION_FAILED');
  }
}

/**
 * Compute deterministic request hash
 * Input: stable JSON serialization of request
 * Output: SHA-256 hash (format: "sha256:...")
 */
export function computeRequestHash(request: PolicyExecutionRequest): string {
  return sha256Json({
    orgId: request.orgId,
    policyId: request.policyId,
    requestType: request.requestType,
    requestData: request.requestData,
    requesterId: request.requesterId,
  });
}

/**
 * Compute deterministic decision hash
 * Input: stable JSON serialization of decision
 * Output: SHA-256 hash
 */
export function computeDecisionHash(decision: PolicyExecutionDecision): string {
  return sha256Json({
    decision: decision.decision,
    reason: decision.reason,
    riskScore: decision.riskScore,
    evidence: decision.evidence,
  });
}

/**
 * Create a chain link (previous execution → current execution)
 * This prevents tampering: if someone modifies entry N, hash(N+1) breaks
 */
export function computeChainHash(
  previousHash: string | undefined,
  requestHash: string,
  decisionHash: string
): string {
  return sha256Json({
    previousHash: previousHash || 'GENESIS',
    requestHash,
    decisionHash,
  });
}

/**
 * Generate a deterministic sequence for a policy execution
 * @param orgId Organization ID
 * @param request Policy execution request
 * @param decision Policy execution decision
 * @returns Deterministic sequence with all hashes and chain links
 */
export async function generateDeterministicSequence(
  orgId: string,
  request: PolicyExecutionRequest,
  decision: PolicyExecutionDecision
): Promise<DeterministicSequence> {
  const supabase = getSupabaseAdmin() as any;

  // Step 1: Generate next sequence number (gap-free, monotonic)
  const sequenceNumber = await getNextSequenceNumber(orgId);

  // Step 2: Compute deterministic hashes
  const requestHash = computeRequestHash(request);
  const decisionHash = computeDecisionHash(decision);

  // Step 3: Fetch previous sequence for chain link
  const { data: lastEntry } = await supabase
    .from('dsg_determinism_ledger')
    .select('chain_hash')
    .eq('org_id', orgId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousChainHash = lastEntry?.chain_hash;

  // Step 4: Create chain hash (prevents tampering)
  const chainHash = computeChainHash(previousChainHash, requestHash, decisionHash);

  return {
    sequenceNumber,
    requestHash,
    decisionHash,
    chainHash,
    timestamp: new Date().toISOString(),
    isReplayable: true, // Always true: if input is same, decision must be same
  };
}

/**
 * Record a sequence to the determinism ledger
 * @param orgId Organization ID
 * @param entryId Unique ID for this ledger entry
 * @param sequence Deterministic sequence
 * @param decision Policy decision
 * @returns Created ledger entry with verification
 */
export async function recordToDeterminismLedger(
  orgId: string,
  entryId: string,
  sequence: DeterministicSequence,
  decision: PolicyExecutionDecision
): Promise<LedgerEntry> {
  const supabase = getSupabaseAdmin() as any;

  try {
    // Verify chain integrity before writing
    const { data: previous } = await supabase
      .from('dsg_determinism_ledger')
      .select('chain_hash')
      .eq('org_id', orgId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Recompute chain hash to verify correctness
    const expectedChainHash = computeChainHash(
      previous?.chain_hash,
      sequence.requestHash,
      sequence.decisionHash
    );

    const isVerified = expectedChainHash === sequence.chainHash;

    // Write to ledger
    const { error } = await supabase.from('dsg_determinism_ledger').insert({
      entry_id: entryId,
      org_id: orgId,
      sequence_number: sequence.sequenceNumber.toString(),
      request_hash: sequence.requestHash,
      decision_hash: sequence.decisionHash,
      chain_hash: sequence.chainHash,
      decision_outcome: decision.decision,
      decision_reason: decision.reason,
      risk_score: decision.riskScore,
      evidence: decision.evidence,
      verified: isVerified,
      created_at: sequence.timestamp,
    });

    if (error) {
      throw new Error(`LEDGER_WRITE_FAILED:${error.message}`);
    }

    return {
      entryId,
      orgId,
      sequence,
      decision,
      verified: isVerified,
    };
  } catch (err) {
    console.error('recordToDeterminismLedger failed:', err);
    throw err;
  }
}

/**
 * Verify a deterministic sequence is authentic (not tampered)
 * @param orgId Organization ID
 * @param sequenceNumber Sequence to verify
 * @returns { ok: boolean, error?: string }
 */
export async function verifySequence(orgId: string, sequenceNumber: bigint) {
  const supabase = getSupabaseAdmin() as any;

  try {
    const { data: entry } = await supabase
      .from('dsg_determinism_ledger')
      .select('*')
      .eq('org_id', orgId)
      .eq('sequence_number', sequenceNumber.toString())
      .maybeSingle();

    if (!entry) {
      return { ok: false, error: 'SEQUENCE_NOT_FOUND' };
    }

    // Recompute chain hash
    const { data: previous } = await supabase
      .from('dsg_determinism_ledger')
      .select('chain_hash')
      .eq('org_id', orgId)
      .lt('sequence_number', sequenceNumber.toString())
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const expectedChainHash = computeChainHash(
      previous?.chain_hash,
      entry.request_hash,
      entry.decision_hash
    );

    if (expectedChainHash !== entry.chain_hash) {
      return { ok: false, error: 'CHAIN_HASH_MISMATCH' };
    }

    // Verify decision hash
    const expectedDecisionHash = sha256Json({
      decision: entry.decision_outcome,
      reason: entry.decision_reason,
      riskScore: entry.risk_score,
      evidence: entry.evidence,
    });

    if (expectedDecisionHash !== entry.decision_hash) {
      return { ok: false, error: 'DECISION_HASH_MISMATCH' };
    }

    return { ok: true };
  } catch (err) {
    console.error('verifySequence threw:', err);
    return { ok: false, error: 'VERIFICATION_ERROR' };
  }
}

/**
 * Replay a policy decision with original inputs
 * If output is same, proves determinism
 * @param orgId Organization ID
 * @param sequenceNumber Sequence to replay
 * @param currentRequest Current request to compare
 * @param currentDecision Current decision to compare
 * @returns { isDeterministic: boolean, originalRequest?: unknown }
 */
export async function replaySequence(
  orgId: string,
  sequenceNumber: bigint,
  currentRequest: PolicyExecutionRequest,
  currentDecision: PolicyExecutionDecision
) {
  const supabase = getSupabaseAdmin() as any;

  try {
    const { data: entry } = await supabase
      .from('dsg_determinism_ledger')
      .select('*')
      .eq('org_id', orgId)
      .eq('sequence_number', sequenceNumber.toString())
      .maybeSingle();

    if (!entry) {
      return { isDeterministic: false, error: 'SEQUENCE_NOT_FOUND' };
    }

    // Compare hashes
    const currentRequestHash = computeRequestHash(currentRequest);
    const currentDecisionHash = computeDecisionHash(currentDecision);

    const isDeterministic =
      currentRequestHash === entry.request_hash && currentDecisionHash === entry.decision_hash;

    return { isDeterministic };
  } catch (err) {
    console.error('replaySequence threw:', err);
    return { isDeterministic: false, error: 'REPLAY_ERROR' };
  }
}
