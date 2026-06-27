import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDriftSnapshot, detectDrift, snapshotHash } from '../../../lib/ccvs/drift-detector';

describe('buildDriftSnapshot', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_SHA = 'abc1234';
    process.env.DSG_POLICY_VERSION = 'v1';
  });

  afterEach(() => {
    Object.assign(process.env, savedEnv);
  });

  it('includes policy_version from env', () => {
    const snap = buildDriftSnapshot();
    expect(snap.policy_version).toBe('v1');
  });

  it('hash_algorithm is sha256', () => {
    const snap = buildDriftSnapshot();
    expect(snap.hash_algorithm).toBe('sha256');
  });

  it('deployment_config_hash changes when GITHUB_SHA changes', () => {
    const snap1 = buildDriftSnapshot();
    process.env.GITHUB_SHA = 'xyz9999';
    const snap2 = buildDriftSnapshot();
    expect(snap1.deployment_config_hash).not.toBe(snap2.deployment_config_hash);
  });

  it('captured_at is a valid ISO date', () => {
    const snap = buildDriftSnapshot();
    expect(new Date(snap.captured_at).toISOString()).toBe(snap.captured_at);
  });

  it('deployment_config_hash starts with sha256: followed by 64 hex chars', () => {
    const snap = buildDriftSnapshot();
    expect(snap.deployment_config_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('deployment_config_hash is same whether NEXT_PUBLIC_SUPABASE_URL is unset or empty string', () => {
    const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hash1 = buildDriftSnapshot().deployment_config_hash;
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    const hash2 = buildDriftSnapshot().deployment_config_hash;
    expect(hash1).toBe(hash2);
    if (saved !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it('deployment_config_hash is same whether DSG_CONTROL_PLANE_BASE_URL is unset or empty string', () => {
    const saved = process.env.DSG_CONTROL_PLANE_BASE_URL;
    delete process.env.DSG_CONTROL_PLANE_BASE_URL;
    const hash1 = buildDriftSnapshot().deployment_config_hash;
    process.env.DSG_CONTROL_PLANE_BASE_URL = '';
    const hash2 = buildDriftSnapshot().deployment_config_hash;
    expect(hash1).toBe(hash2);
    if (saved !== undefined) process.env.DSG_CONTROL_PLANE_BASE_URL = saved;
    else delete process.env.DSG_CONTROL_PLANE_BASE_URL;
  });

  it('deployment_config_hash is same whether VERCEL_GIT_COMMIT_SHA is unset or empty string', () => {
    const saved = process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    const hash1 = buildDriftSnapshot().deployment_config_hash;
    process.env.VERCEL_GIT_COMMIT_SHA = '';
    const hash2 = buildDriftSnapshot().deployment_config_hash;
    expect(hash1).toBe(hash2);
    if (saved !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = saved;
    else delete process.env.VERCEL_GIT_COMMIT_SHA;
  });
});

describe('detectDrift — no previous', () => {
  it('changed=false when previous is null', () => {
    const current = buildDriftSnapshot();
    const report = detectDrift(null, current);
    expect(report.changed).toBe(false);
    expect(report.fields_changed).toHaveLength(0);
    expect(report.invalidated_attestations).toHaveLength(0);
  });
});

describe('detectDrift — with previous', () => {
  it('detects policy_version change', () => {
    const prev = buildDriftSnapshot({ policy_version: 'v1' });
    const curr = buildDriftSnapshot({ policy_version: 'v2' });
    const report = detectDrift(prev, curr);
    expect(report.changed).toBe(true);
    expect(report.fields_changed).toContain('policy_version');
    expect(report.invalidated_attestations).toContain('all_compliance_attestations');
    expect(report.invalidated_attestations).toContain('all_evidence_envelopes');
  });

  it('detects deployment_config_hash change', () => {
    const prev = buildDriftSnapshot({ deployment_config_hash: 'sha256:' + 'a'.repeat(64) });
    const curr = buildDriftSnapshot({ deployment_config_hash: 'sha256:' + 'b'.repeat(64) });
    const report = detectDrift(prev, curr);
    expect(report.changed).toBe(true);
    expect(report.fields_changed).toContain('deployment_config_hash');
    expect(report.invalidated_attestations).toContain('deployment_provenance');
  });

  it('detects hash_algorithm change', () => {
    const prev = buildDriftSnapshot();
    const curr = { ...prev, hash_algorithm: 'sha512', captured_at: new Date().toISOString() };
    const report = detectDrift(prev, curr);
    expect(report.changed).toBe(true);
    expect(report.fields_changed).toContain('hash_algorithm');
    expect(report.invalidated_attestations).toContain('all_integrity_hashes');
  });

  it('no change when snapshots are identical except captured_at', () => {
    const prev = buildDriftSnapshot();
    const curr = { ...prev, captured_at: new Date(Date.now() + 1000).toISOString() };
    const report = detectDrift(prev, curr);
    expect(report.changed).toBe(false);
  });

  it('invalidated_attestations is deduplicated', () => {
    const prev = buildDriftSnapshot({ policy_version: 'v1', schema_version: '1.0.0' });
    const curr = buildDriftSnapshot({ policy_version: 'v2', schema_version: '2.0.0' });
    const report = detectDrift(prev, curr);
    const unique = new Set(report.invalidated_attestations);
    expect(report.invalidated_attestations.length).toBe(unique.size);
  });
});

describe('snapshotHash', () => {
  it('is deterministic for the same snapshot content', () => {
    const snap = buildDriftSnapshot({ policy_version: 'v1', schema_version: '1.0.0' });
    const h1 = snapshotHash(snap);
    const h2 = snapshotHash({ ...snap, captured_at: new Date(Date.now() + 5000).toISOString() });
    expect(h1).toBe(h2);
  });

  it('changes when policy_version changes', () => {
    const snap1 = buildDriftSnapshot({ policy_version: 'v1' });
    const snap2 = buildDriftSnapshot({ policy_version: 'v2' });
    expect(snapshotHash(snap1)).not.toBe(snapshotHash(snap2));
  });

  it('is prefixed with sha256:', () => {
    const snap = buildDriftSnapshot();
    expect(snapshotHash(snap)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
