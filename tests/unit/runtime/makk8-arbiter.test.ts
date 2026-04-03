import { describe, expect, it } from 'vitest';

import {
  buildDhammaProofHash,
  MAKK8_INVARIANT_SET,
  Makk8Arbiter,
  MAKK8_VERSION,
  signDhammaProof,
} from '../../../lib/runtime/makk8-arbiter';

describe('Makk8Arbiter', () => {
  it('returns SAMMA when all invariants are satisfied', () => {
    const arbiter = new Makk8Arbiter();
    const result = arbiter.verifyPathIntegrity({
      value: 500,
      is_grounded: true,
      intent_score: 10,
      is_api_clean: true,
      source_verified: true,
      compute_cost: 50,
      has_audit_trail: true,
      nonce_lock: true,
    });

    expect(result.ok).toBe(true);
    expect(result.reason).toBe('SAMMA');
  });

  it('returns PATH_CONFLICT when one or more invariants fail', () => {
    const arbiter = new Makk8Arbiter();
    const result = arbiter.verifyPathIntegrity({
      value: 500,
      is_grounded: true,
      intent_score: 10,
      is_api_clean: true,
      source_verified: true,
      compute_cost: 5000,
      has_audit_trail: true,
      nonce_lock: true,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PATH_CONFLICT');
    expect(result.artifact.rightEffort).toBe(false);
  });

  it('builds deterministic proof hashes and signatures', () => {
    const arbiter = new Makk8Arbiter();
    const { artifact } = arbiter.verifyPathIntegrity({
      value: 100,
      is_grounded: true,
      intent_score: 1,
      is_api_clean: true,
      source_verified: true,
      compute_cost: 10,
      has_audit_trail: true,
      nonce_lock: true,
    });

    const hash1 = buildDhammaProofHash(artifact, 100);
    const hash2 = buildDhammaProofHash(artifact, 100);
    expect(hash1).toBe(hash2);

    const sig = signDhammaProof(hash1, 'DSG_PRIVATE_KEY_V159');
    expect(sig).toHaveLength(64);
    expect(MAKK8_VERSION).toBe('V159-DHAMMA-INTEGRITY');
    expect(MAKK8_INVARIANT_SET).toBe('MAKK-8-LOGIC-v1.0');
  });
});
