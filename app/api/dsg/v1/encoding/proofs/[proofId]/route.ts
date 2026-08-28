import { NextRequest, NextResponse } from 'next/server';
import { validateProofHash } from '@/lib/dsg/deterministic/encoding-proof-engine';
import { getPersistedEncodingProof } from '@/lib/dsg/deterministic/encoding-proof-store';
import {
  requireDsgAuth,
  dsgAuthError,
} from '@/lib/dsg/auth/require-dsg-auth';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const PROOF_ID = /^epf_[0-9a-f]{32}$/;

/**
 * Read-only authority lookup for a previously persisted encoding proof.
 *
 * Solver services use this endpoint to verify that a caller-supplied proof id
 * actually exists in the authenticated Control Plane organization and that the
 * persisted proof still passes its canonical proof-hash integrity check. This
 * endpoint never creates a proof and never records billable gate usage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proofId: string }> },
) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) {
    return dsgAuthError(caller as typeof caller & { ok: false });
  }

  const { proofId } = await params;
  if (!PROOF_ID.test(proofId)) {
    return NextResponse.json(
      { ok: false, status: 'BLOCK', error: 'invalid_encoding_proof_id' },
      { status: 400 },
    );
  }

  try {
    const proof = await getPersistedEncodingProof({
      organizationId: caller.orgId,
      proofId,
    });

    if (!proof) {
      return NextResponse.json(
        { ok: false, status: 'BLOCK', error: 'encoding_proof_not_found' },
        { status: 404 },
      );
    }

    if (!validateProofHash(proof)) {
      return NextResponse.json(
        { ok: false, status: 'BLOCK', error: 'stored_proof_integrity_failure' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: proof.status,
      proofId: proof.proofId,
      proof,
    });
  } catch (error) {
    const message = String(error);
    if (message.includes('encoding_proof_store:')) {
      return NextResponse.json(
        { ok: false, status: 'BLOCK', error: 'proof_store_unavailable' },
        { status: 503 },
      );
    }
    return handleApiError('api/dsg/v1/encoding/proofs/[proofId]', error);
  }
}
