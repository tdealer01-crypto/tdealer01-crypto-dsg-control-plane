import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGatewayEvidenceBundle } from '../../../lib/gateway/evidence-bundle';

const event1 = { type: 'tool_execute', toolName: 'slack.post', orgId: 'org-1' };
const event2 = { type: 'tool_block', toolName: 'stripe.refund', orgId: 'org-1', reason: 'role_not_allowed' };

describe('buildGatewayEvidenceBundle — structure', () => {
  it('returns ok:true', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.ok).toBe(true);
  });

  it('sets type to dsg-gateway-signed-evidence-bundle', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.type).toBe('dsg-gateway-signed-evidence-bundle');
  });

  it('sets version to 1.0', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.version).toBe('1.0');
  });

  it('preserves orgId', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-specific', events: [] });
    expect(bundle.orgId).toBe('org-specific');
  });

  it('count matches events array length', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1, event2] });
    expect(bundle.count).toBe(2);
  });

  it('count is 0 for empty events', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.count).toBe(0);
  });

  it('eventHashes array length matches events length', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1, event2] });
    expect(bundle.eventHashes).toHaveLength(2);
  });

  it('each eventHash is a 64-char hex string', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1] });
    expect(bundle.eventHashes[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('bundleHash is a 64-char hex string', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.bundleHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('preserves events array in output', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1] });
    expect(bundle.events).toEqual([event1]);
  });

  it('auditToken is null when not provided', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.auditToken).toBeNull();
  });

  it('preserves auditToken when provided', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [], auditToken: 'tok_abc' });
    expect(bundle.auditToken).toBe('tok_abc');
  });

  it('uses provided exportedAt timestamp', () => {
    const ts = '2025-01-01T00:00:00.000Z';
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [], exportedAt: ts });
    expect(bundle.exportedAt).toBe(ts);
  });

  it('defaults exportedAt to current ISO timestamp when not provided', () => {
    const before = Date.now();
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    const after = Date.now();
    const ts = new Date(bundle.exportedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('buildGatewayEvidenceBundle — evidenceBoundary', () => {
  it('certificationClaim is false', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.evidenceBoundary.certificationClaim).toBe(false);
  });

  it('independentAuditClaim is false', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.evidenceBoundary.independentAuditClaim).toBe(false);
  });

  it('statement is non-empty string', () => {
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(typeof bundle.evidenceBoundary.statement).toBe('string');
    expect(bundle.evidenceBoundary.statement.length).toBeGreaterThan(0);
  });
});

describe('buildGatewayEvidenceBundle — determinism', () => {
  it('bundleHash is deterministic for identical inputs with fixed exportedAt', () => {
    const input = { orgId: 'org-1', events: [event1], exportedAt: '2025-01-01T00:00:00.000Z' };
    const b1 = buildGatewayEvidenceBundle(input);
    const b2 = buildGatewayEvidenceBundle(input);
    expect(b1.bundleHash).toBe(b2.bundleHash);
  });

  it('bundleHash changes when events change', () => {
    const b1 = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [], exportedAt: '2025-01-01T00:00:00.000Z' });
    const b2 = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1], exportedAt: '2025-01-01T00:00:00.000Z' });
    expect(b1.bundleHash).not.toBe(b2.bundleHash);
  });

  it('bundleHash changes when orgId changes', () => {
    const b1 = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [], exportedAt: '2025-01-01T00:00:00.000Z' });
    const b2 = buildGatewayEvidenceBundle({ orgId: 'org-2', events: [], exportedAt: '2025-01-01T00:00:00.000Z' });
    expect(b1.bundleHash).not.toBe(b2.bundleHash);
  });

  it('eventHash for same event is deterministic', () => {
    const b1 = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1], exportedAt: '2025-01-01T00:00:00.000Z' });
    const b2 = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [event1], exportedAt: '2025-01-01T00:00:00.000Z' });
    expect(b1.eventHashes[0]).toBe(b2.eventHashes[0]);
  });
});

describe('buildGatewayEvidenceBundle — signing', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses hash-only mode when DSG_EVIDENCE_SIGNING_SECRET is absent', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', '');
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.signature.signatureMode).toBe('hash-only');
    expect(bundle.signature.algorithm).toBe('sha256');
    expect(bundle.signature.signature).toBe(bundle.bundleHash);
    expect(bundle.signature.keyId).toBe('none');
  });

  it('uses HMAC mode when DSG_EVIDENCE_SIGNING_SECRET is set', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', 'super-secret-key');
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.signature.signatureMode).toBe('hmac');
    expect(bundle.signature.algorithm).toBe('hmac-sha256');
    expect(bundle.signature.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.signature.signature).not.toBe(bundle.bundleHash);
  });

  it('HMAC signature differs from bundleHash', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', 'my-key');
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.signature.signature).not.toBe(bundle.bundleHash);
  });

  it('uses custom keyId from DSG_EVIDENCE_SIGNING_KEY_ID when set', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', 'my-key');
    vi.stubEnv('DSG_EVIDENCE_SIGNING_KEY_ID', 'key-v2');
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.signature.keyId).toBe('key-v2');
  });

  it('falls back to env:DSG_EVIDENCE_SIGNING_SECRET as keyId when KEY_ID is not set', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', 'my-key');
    vi.stubEnv('DSG_EVIDENCE_SIGNING_KEY_ID', '');
    const bundle = buildGatewayEvidenceBundle({ orgId: 'org-1', events: [] });
    expect(bundle.signature.keyId).toBe('env:DSG_EVIDENCE_SIGNING_SECRET');
  });

  it('HMAC signature is deterministic for same secret and input', () => {
    vi.stubEnv('DSG_EVIDENCE_SIGNING_SECRET', 'stable-key');
    const input = { orgId: 'org-1', events: [], exportedAt: '2025-01-01T00:00:00.000Z' };
    const b1 = buildGatewayEvidenceBundle(input);
    const b2 = buildGatewayEvidenceBundle(input);
    expect(b1.signature.signature).toBe(b2.signature.signature);
  });
});
