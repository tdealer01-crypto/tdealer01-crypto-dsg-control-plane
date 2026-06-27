import { describe, expect, it } from 'vitest';
import { hashGatewayValue, buildGatewayAuditProof } from '../../../lib/gateway/audit';
import type { GatewayToolRequest, GatewayToolProviderResult } from '../../../lib/gateway/types';

const validRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'user-1',
  actorRole: 'owner',
  orgPlan: 'pro',
  toolName: 'zapier.slack.post_message',
  action: 'post_message',
  input: { channel: '#general', text: 'hello' },
};

const validProviderResult: GatewayToolProviderResult = {
  ok: true,
  provider: 'zapier',
  toolName: 'zapier.slack.post_message',
  action: 'post_message',
  result: { ts: '12345' },
};

describe('hashGatewayValue', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    expect(hashGatewayValue('test')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical inputs', () => {
    const h1 = hashGatewayValue({ a: 1, b: 2 });
    const h2 = hashGatewayValue({ a: 1, b: 2 });
    expect(h1).toBe(h2);
  });

  it('produces same hash regardless of object key insertion order', () => {
    const h1 = hashGatewayValue({ a: 1, b: 2 });
    const h2 = hashGatewayValue({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it('sorts nested object keys recursively', () => {
    const h1 = hashGatewayValue({ outer: { z: 9, a: 1 } });
    const h2 = hashGatewayValue({ outer: { a: 1, z: 9 } });
    expect(h1).toBe(h2);
  });

  it('preserves array element order (arrays are not sorted)', () => {
    const h1 = hashGatewayValue([1, 2, 3]);
    const h2 = hashGatewayValue([3, 2, 1]);
    expect(h1).not.toBe(h2);
  });

  it('handles null correctly', () => {
    expect(() => hashGatewayValue(null)).not.toThrow();
    expect(hashGatewayValue(null)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles primitive string', () => {
    expect(hashGatewayValue('hello')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles primitive number', () => {
    expect(hashGatewayValue(42)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different values', () => {
    expect(hashGatewayValue({ a: 1 })).not.toBe(hashGatewayValue({ a: 2 }));
  });
});

describe('buildGatewayAuditProof', () => {
  it('returns requestHash and recordHash as 64-char hex strings', () => {
    const proof = buildGatewayAuditProof(validRequest, validProviderResult, 'allow');
    expect(proof.requestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.recordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('requestHash is deterministic for identical requests', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'allow');
    const p2 = buildGatewayAuditProof(validRequest, null, 'allow');
    expect(p1.requestHash).toBe(p2.requestHash);
  });

  it('recordHash is deterministic for identical inputs', () => {
    const p1 = buildGatewayAuditProof(validRequest, validProviderResult, 'allow');
    const p2 = buildGatewayAuditProof(validRequest, validProviderResult, 'allow');
    expect(p1.recordHash).toBe(p2.recordHash);
  });

  it('requestHash differs when orgId changes', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'allow');
    const p2 = buildGatewayAuditProof({ ...validRequest, orgId: 'org-2' }, null, 'allow');
    expect(p1.requestHash).not.toBe(p2.requestHash);
  });

  it('recordHash differs when decision changes', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'allow');
    const p2 = buildGatewayAuditProof(validRequest, null, 'block');
    expect(p1.recordHash).not.toBe(p2.recordHash);
  });

  it('committed is true when providerResult.ok is true', () => {
    const proof = buildGatewayAuditProof(validRequest, validProviderResult, 'allow');
    expect(proof.committed).toBe(true);
  });

  it('committed is false when decision is allow and no providerResult', () => {
    const proof = buildGatewayAuditProof(validRequest, null, 'allow');
    expect(proof.committed).toBe(false);
  });

  it('committed is true when decision is block (non-allow = committed for audit)', () => {
    const proof = buildGatewayAuditProof(validRequest, null, 'block');
    expect(proof.committed).toBe(true);
  });

  it('committed is true when decision is review', () => {
    const proof = buildGatewayAuditProof(validRequest, null, 'review');
    expect(proof.committed).toBe(true);
  });

  it('recordHash changes when providerResult changes', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'allow');
    const p2 = buildGatewayAuditProof(validRequest, validProviderResult, 'allow');
    expect(p1.recordHash).not.toBe(p2.recordHash);
  });

  it('recordHash changes when reason changes', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'block', 'missing_org_id');
    const p2 = buildGatewayAuditProof(validRequest, null, 'block', 'role_not_allowed');
    expect(p1.recordHash).not.toBe(p2.recordHash);
  });

  it('undefined reason and absent reason produce same recordHash', () => {
    const p1 = buildGatewayAuditProof(validRequest, null, 'block');
    const p2 = buildGatewayAuditProof(validRequest, null, 'block', undefined);
    expect(p1.recordHash).toBe(p2.recordHash);
  });
});
