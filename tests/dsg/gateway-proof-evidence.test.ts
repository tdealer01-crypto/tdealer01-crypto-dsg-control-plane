import { describe, expect, it } from 'vitest';
import { bindGatewayProofEvidence } from '@/lib/dsg/runtime/gateway-proof-evidence';

describe('gateway proof evidence', () => {
  it('binds evidence with correct fields', () => {
    const bundle = bindGatewayProofEvidence({
      jobId: 'job-1',
      actorId: 'actor-1',
      gatewayProof: {
        decision: 'PASS', violated: [], smt2: '(assert true)', smt2Hash: 'sha256:' + 'a'.repeat(64), resultHash: 'sha256:' + 'b'.repeat(64),
        policyVersion: 'v1', sourceRepo: 'repo', sourceRef: 'ref',
      },
    });

    expect(bundle.evidence.evidenceType).toBe('gateway_proof');
    expect(bundle.auditEntry.currentHash.startsWith('sha256:')).toBe(true);
    expect(bundle.replayHash.startsWith('sha256:')).toBe(true);
  });
});
