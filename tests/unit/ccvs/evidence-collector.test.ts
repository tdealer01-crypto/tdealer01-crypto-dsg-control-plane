import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildEvidenceEnvelope,
  verifyEnvelopeIntegrity,
  buildRunContextFromEnv,
  buildOIDCFromEnv,
  EVIDENCE_SEVERITY,
} from '../../../lib/ccvs/evidence-collector';
import type { CollectorOptions, EvidenceRunContext, EvidenceOIDC } from '../../../lib/ccvs/evidence-collector';

const testRun: EvidenceRunContext = {
  repo: 'org/repo',
  commit: 'abc1234',
  ref: 'refs/heads/main',
  workflow_run_id: '999',
  builder_id: 'https://github.com/actions/runner',
  invocation_id: '999-1',
};

const testOIDC: EvidenceOIDC = {
  issuer: 'https://token.actions.githubusercontent.com',
  audience: 'ccvs-evidence',
  sub: 'repo:org/repo:ref:refs/heads/main',
};

const baseOpts: CollectorOptions = {
  evidenceType: 'unit',
  subjects: [{ name: 'repo:org/repo', digest: { sha1: 'abc1234' } }],
  run: testRun,
  oidc: testOIDC,
  metrics: { tests_total: 50, tests_passed: 50, tests_failed: 0 },
};

describe('buildEvidenceEnvelope', () => {
  it('produces schema_version 1.0.0', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    expect(env.schema_version).toBe('1.0.0');
  });

  it('sets severity_level from evidence type', () => {
    const env = buildEvidenceEnvelope({ ...baseOpts, evidenceType: 'mutation' });
    expect(env.severity_level).toBe(EVIDENCE_SEVERITY['mutation']);
    expect(env.severity_level).toBe(4);
  });

  it('assigns severity 1 to unit, 2 to integration, 3 to adversarial, 5 to provenance', () => {
    expect(buildEvidenceEnvelope({ ...baseOpts, evidenceType: 'unit' }).severity_level).toBe(1);
    expect(buildEvidenceEnvelope({ ...baseOpts, evidenceType: 'integration' }).severity_level).toBe(2);
    expect(buildEvidenceEnvelope({ ...baseOpts, evidenceType: 'adversarial' }).severity_level).toBe(3);
    expect(buildEvidenceEnvelope({ ...baseOpts, evidenceType: 'provenance' }).severity_level).toBe(5);
  });

  it('chain_hash is prefixed with sha256:', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    expect(env.integrity.chain_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('chain_hash changes when metrics change', () => {
    const a = buildEvidenceEnvelope({ ...baseOpts, metrics: { tests_passed: 10 } });
    const b = buildEvidenceEnvelope({ ...baseOpts, metrics: { tests_passed: 11 } });
    expect(a.integrity.chain_hash).not.toBe(b.integrity.chain_hash);
  });

  it('carries previous_chain_hash when supplied', () => {
    const prev = 'sha256:' + 'a'.repeat(64);
    const env = buildEvidenceEnvelope({ ...baseOpts, previousChainHash: prev });
    expect(env.integrity.previous_chain_hash).toBe(prev);
  });

  it('sets expires_at when ttlSeconds provided', () => {
    const env = buildEvidenceEnvelope({ ...baseOpts, ttlSeconds: 3600 });
    expect(env.expires_at).toBeDefined();
    expect(new Date(env.expires_at!).getTime()).toBeGreaterThan(Date.now());
  });

  it('stores nonce when provided', () => {
    const env = buildEvidenceEnvelope({ ...baseOpts, nonce: 'test-nonce-xyz' });
    expect(env.nonce).toBe('test-nonce-xyz');
  });

  it('includes sbom_ref when provided', () => {
    const env = buildEvidenceEnvelope({ ...baseOpts, sbomRef: 'sbom.cyclonedx.json' });
    expect(env.integrity.sbom_ref).toBe('sbom.cyclonedx.json');
  });

  it('generated_at is a valid ISO date', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    expect(new Date(env.generated_at).toISOString()).toBe(env.generated_at);
  });
});

describe('verifyEnvelopeIntegrity', () => {
  it('returns ok=true for a freshly built envelope', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    expect(verifyEnvelopeIntegrity(env).ok).toBe(true);
  });

  it('returns ok=false when chain_hash is tampered', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    const tampered = { ...env, integrity: { ...env.integrity, chain_hash: 'sha256:' + 'b'.repeat(64) } };
    expect(verifyEnvelopeIntegrity(tampered).ok).toBe(false);
  });

  it('returns ok=false when metrics are tampered', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    const tampered = { ...env, metrics: { tests_passed: 999, tests_failed: 0 } };
    expect(verifyEnvelopeIntegrity(tampered).ok).toBe(false);
  });

  it('expected hash matches chain_hash for a valid envelope', () => {
    const env = buildEvidenceEnvelope(baseOpts);
    const { ok, expected } = verifyEnvelopeIntegrity(env);
    expect(ok).toBe(true);
    expect(expected).toBe(env.integrity.chain_hash);
  });
});

describe('buildRunContextFromEnv', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
    process.env.GITHUB_SHA = 'def5678';
    process.env.GITHUB_RUN_ID = '12345';
    process.env.GITHUB_RUN_ATTEMPT = '1';
  });

  afterEach(() => {
    Object.assign(process.env, savedEnv);
  });

  it('reads repo and commit from env', () => {
    const ctx = buildRunContextFromEnv();
    expect(ctx.repo).toBe('test-org/test-repo');
    expect(ctx.commit).toBe('def5678');
  });

  it('builds invocation_id from run_id + attempt', () => {
    const ctx = buildRunContextFromEnv();
    expect(ctx.invocation_id).toBe('12345-1');
  });
});

describe('buildOIDCFromEnv', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
    process.env.GITHUB_REF = 'refs/heads/feature';
  });

  afterEach(() => {
    Object.assign(process.env, savedEnv);
  });

  it('builds sub from repo + ref', () => {
    const oidc = buildOIDCFromEnv();
    expect(oidc.sub).toBe('repo:test-org/test-repo:ref:refs/heads/feature');
  });

  it('uses provided audience', () => {
    const oidc = buildOIDCFromEnv('custom-audience');
    expect(oidc.audience).toBe('custom-audience');
  });
});
