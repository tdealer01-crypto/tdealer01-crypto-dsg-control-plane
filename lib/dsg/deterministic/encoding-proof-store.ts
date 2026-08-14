import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { EncodingProof, EncodingType } from './encoding-proof-types';

const GENESIS_HASH = '0'.repeat(64);

type StoredRow = {
  sequence: number;
  organization_id: string;
  problem_id: string;
  encoding_type: EncodingType;
  nonce: string;
  idempotency_key: string;
  request_hash: string;
  encoding_hash: string;
  proof_id: string;
  proof_hash: string;
  previous_proof_hash: string;
  proof: EncodingProof;
  created_at: string;
};

export type ReplayLookup =
  | { kind: 'new'; previousProofHash: string }
  | { kind: 'replay'; proof: EncodingProof }
  | { kind: 'idempotency_conflict'; message: string }
  | { kind: 'nonce_replay'; message: string };

function admin() {
  // The generated Database type is updated separately by db:types after the
  // migration is applied. The runtime contract is defined by the migration.
  return getSupabaseAdmin() as any;
}

function storeError(stage: string, error: unknown): Error {
  const detail =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error ?? 'unknown_error');
  return new Error(`encoding_proof_store:${stage}:${detail}`);
}

export async function inspectEncodingProofRequest(input: {
  organizationId: string;
  nonce: string;
  idempotencyKey: string;
  requestHash: string;
}): Promise<ReplayLookup> {
  const db = admin();

  const { data: idempotent, error: idemError } = await db
    .from('dsg_encoding_proofs')
    .select('request_hash, proof')
    .eq('organization_id', input.organizationId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();

  if (idemError) throw storeError('lookup_idempotency', idemError);
  if (idempotent) {
    if (String(idempotent.request_hash) !== input.requestHash) {
      return {
        kind: 'idempotency_conflict',
        message: 'idempotencyKey was already used for a different canonical request',
      };
    }
    return { kind: 'replay', proof: idempotent.proof as EncodingProof };
  }

  const { data: nonceRow, error: nonceError } = await db
    .from('dsg_encoding_proofs')
    .select('request_hash, idempotency_key')
    .eq('organization_id', input.organizationId)
    .eq('nonce', input.nonce)
    .maybeSingle();

  if (nonceError) throw storeError('lookup_nonce', nonceError);
  if (nonceRow) {
    return {
      kind: 'nonce_replay',
      message: 'nonce was already consumed; reuse the original idempotencyKey only for an exact retry',
    };
  }

  const { data: latest, error: latestError } = await db
    .from('dsg_encoding_proofs')
    .select('proof_hash')
    .eq('organization_id', input.organizationId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw storeError('lookup_chain_head', latestError);
  return {
    kind: 'new',
    previousProofHash: latest?.proof_hash ? String(latest.proof_hash) : GENESIS_HASH,
  };
}

export async function persistEncodingProof(input: {
  organizationId: string;
  problemId: string;
  encodingType: EncodingType;
  nonce: string;
  idempotencyKey: string;
  requestHash: string;
  proof: EncodingProof;
}): Promise<void> {
  const db = admin();
  const row = {
    organization_id: input.organizationId,
    problem_id: input.problemId,
    encoding_type: input.encodingType,
    nonce: input.nonce,
    idempotency_key: input.idempotencyKey,
    request_hash: input.requestHash,
    encoding_hash: input.proof.encodingHash,
    proof_id: input.proof.proofId,
    proof_hash: input.proof.proofHash,
    previous_proof_hash: input.proof.previousProofHash,
    proof: input.proof,
  };

  const { error } = await db.from('dsg_encoding_proofs').insert(row);
  if (!error) return;

  // 23505 includes idempotency, nonce and chain-head races. All are fail-closed;
  // a client may retry the same idempotency key, which will then resolve to the
  // already-persisted proof through inspectEncodingProofRequest().
  if (String(error.code ?? '') === '23505') {
    throw new Error('encoding_proof_store:chain_or_replay_conflict');
  }
  throw storeError('insert', error);
}

export async function getEncodingProofChainHead(
  organizationId: string,
): Promise<Pick<StoredRow, 'proof_hash' | 'sequence'> | null> {
  const db = admin();
  const { data, error } = await db
    .from('dsg_encoding_proofs')
    .select('sequence, proof_hash')
    .eq('organization_id', organizationId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw storeError('chain_head', error);
  return data ? { sequence: Number(data.sequence), proof_hash: String(data.proof_hash) } : null;
}
