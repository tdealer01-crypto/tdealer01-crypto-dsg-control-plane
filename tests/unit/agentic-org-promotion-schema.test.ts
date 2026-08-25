import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = JSON.parse(
  readFileSync(resolve(process.cwd(), 'contracts/agentic-improvement/promotion-envelope.v1.schema.json'), 'utf8'),
) as any;

describe('agentic improvement promotion JSON schema', () => {
  it('requires commit, metric, test, and build evidence at the canonical promotion boundary', () => {
    const containsKinds = new Set(
      schema.properties.evidence.allOf.map((rule: any) => rule.contains.properties.kind.const),
    );
    expect(containsKinds).toEqual(new Set(['commit', 'metric', 'test_output', 'build_output']));
    expect(schema.properties.evidence.minItems).toBeGreaterThanOrEqual(4);
  });

  it('requires digest and commit binding on every raw artifact evidence ref', () => {
    const evidence = schema.$defs.evidence;
    const rawRule = evidence.allOf.find((rule: any) =>
      rule.if?.properties?.kind?.enum?.includes('metric'),
    );
    expect(new Set(rawRule.then.required)).toEqual(new Set(['sha256', 'repository', 'commitSha']));
    expect(evidence.properties.sha256.pattern).toBe('^[a-f0-9]{64}$');
  });

  it('cannot represent VERIFIED_RAW_EVIDENCE without an independently verified raw flag', () => {
    const proof = schema.properties.cinemaProof;
    expect(new Set(proof.required)).toEqual(new Set([
      'proofId',
      'proofHash',
      'verified',
      'verification',
      'rawEvidenceVerified',
      'boundCandidateCommit',
    ]));

    const rawRule = proof.allOf.find(
      (rule: any) => rule.if?.properties?.verification?.const === 'VERIFIED_RAW_EVIDENCE',
    );
    expect(rawRule.then.properties.verified.const).toBe(true);
    expect(rawRule.then.properties.rawEvidenceVerified.const).toBe(true);
  });

  it('keeps structural envelope binding distinct from raw-evidence verification', () => {
    const proof = schema.properties.cinemaProof;
    const structuralRule = proof.allOf.find(
      (rule: any) => rule.if?.properties?.verification?.const === 'VERIFIED_ENVELOPE_BINDING',
    );
    expect(structuralRule.then.properties.rawEvidenceVerified.const).toBe(false);
  });
});
