import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { EncodingProof } from '@/lib/dsg/deterministic/encoding-proof-types';
import { GET } from '@/app/api/dsg/v1/encoding/proofs/[proofId]/route';
import { requireDsgAuth } from '@/lib/dsg/auth/require-dsg-auth';
import { getPersistedEncodingProof } from '@/lib/dsg/deterministic/encoding-proof-store';
import { validateProofHash } from '@/lib/dsg/deterministic/encoding-proof-engine';

vi.mock('@/lib/dsg/auth/require-dsg-auth', () => ({
  requireDsgAuth: vi.fn(),
  dsgAuthError: vi.fn(() => NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })),
}));

vi.mock('@/lib/dsg/deterministic/encoding-proof-store', () => ({
  getPersistedEncodingProof: vi.fn(),
}));

vi.mock('@/lib/dsg/deterministic/encoding-proof-engine', () => ({
  validateProofHash: vi.fn(),
}));

const PROOF_ID = `epf_${'a'.repeat(32)}`;

function request(): NextRequest {
  return new NextRequest(`https://control-plane.test/api/dsg/v1/encoding/proofs/${PROOF_ID}`);
}

function proof(): EncodingProof {
  return {
    proofId: PROOF_ID,
    proofHash: 'b'.repeat(64),
    encodingHash: 'c'.repeat(64),
    subject: {
      problemId: 'problem-1',
      encodingType: 'qubo-v1',
      requestHash: 'd'.repeat(64),
      nonceHash: 'e'.repeat(64),
      idempotencyKeyHash: 'f'.repeat(64),
    },
    checks: {
      linear_terms_valid: true,
      quadratic_terms_valid: true,
      dimension_within_bounds: true,
      coefficient_magnitude_bounded: true,
      no_nan_or_infinity: true,
      no_duplicate_edges: true,
      variable_naming_consistent: true,
      encoding_type_matches: true,
    },
    status: 'PASS',
    constraintSetHash: '1'.repeat(64),
    previousProofHash: '0'.repeat(64),
    timestamp: '2026-08-29T00:00:00.000Z',
    policyVersion: '1.0',
    metadata: {
      dimensionCount: 2,
      linearTermsCount: 1,
      quadraticTermsCount: 0,
      maxCoefficientValue: '1',
    },
    evidenceBoundary: {
      statement: 'structural encoding proof only',
      externalVerifierInvoked: false,
      certificationClaim: false,
    },
  };
}

describe('GET encoding proof authority lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireDsgAuth).mockResolvedValue({
      ok: true,
      orgId: 'org-1',
      actorType: 'api_key',
      apiKeyId: 'key-1',
    });
    vi.mocked(getPersistedEncodingProof).mockResolvedValue(proof());
    vi.mocked(validateProofHash).mockReturnValue(true);
  });

  it('rejects malformed proof ids before querying the store', async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ proofId: 'epf_not-a-valid-id' }),
    });

    expect(response.status).toBe(400);
    expect(getPersistedEncodingProof).not.toHaveBeenCalled();
  });

  it('looks up the proof inside the authenticated organization and returns the persisted proof', async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ proofId: PROOF_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getPersistedEncodingProof).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proofId: PROOF_ID,
    });
    expect(body.ok).toBe(true);
    expect(body.status).toBe('PASS');
    expect(body.proofId).toBe(PROOF_ID);
  });

  it('fails closed when the proof does not exist in that organization', async () => {
    vi.mocked(getPersistedEncodingProof).mockResolvedValue(null);

    const response = await GET(request(), {
      params: Promise.resolve({ proofId: PROOF_ID }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('encoding_proof_not_found');
  });

  it('fails closed when the persisted proof hash is invalid', async () => {
    vi.mocked(validateProofHash).mockReturnValue(false);

    const response = await GET(request(), {
      params: Promise.resolve({ proofId: PROOF_ID }),
    });

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('stored_proof_integrity_failure');
  });

  it('does not expose database errors', async () => {
    vi.mocked(getPersistedEncodingProof).mockRejectedValue(
      new Error('encoding_proof_store:lookup_proof_id:database detail'),
    );

    const response = await GET(request(), {
      params: Promise.resolve({ proofId: PROOF_ID }),
    });

    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe('proof_store_unavailable');
  });
});
