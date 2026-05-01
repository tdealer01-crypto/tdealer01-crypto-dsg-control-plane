import crypto from 'node:crypto';
import { hashGatewayValue } from './audit';

export type GatewayEvidenceBundleEvent = Record<string, unknown>;

export type GatewayEvidenceBundleInput = {
  orgId: string;
  auditToken?: string;
  exportedAt?: string;
  events: GatewayEvidenceBundleEvent[];
};

function signBundle(bundleHash: string) {
  const secret = process.env.DSG_EVIDENCE_SIGNING_SECRET?.trim();

  if (!secret) {
    return {
      algorithm: 'sha256',
      signature: bundleHash,
      signatureMode: 'hash-only',
      keyId: 'none',
    };
  }

  const keyId = process.env.DSG_EVIDENCE_SIGNING_KEY_ID?.trim() || 'env:DSG_EVIDENCE_SIGNING_SECRET';
  const signature = crypto.createHmac('sha256', secret).update(bundleHash).digest('hex');

  return {
    algorithm: 'hmac-sha256',
    signature,
    signatureMode: 'hmac',
    keyId,
  };
}

export function buildGatewayEvidenceBundle(input: GatewayEvidenceBundleInput) {
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const events = Array.isArray(input.events) ? input.events : [];
  const eventHashes = events.map((event) => hashGatewayValue(event));
  const bundleHash = hashGatewayValue({
    type: 'dsg-gateway-signed-evidence-bundle',
    version: '1.0',
    orgId: input.orgId,
    auditToken: input.auditToken ?? null,
    exportedAt,
    eventHashes,
    events,
  });

  const signature = signBundle(bundleHash);

  return {
    ok: true,
    type: 'dsg-gateway-signed-evidence-bundle',
    version: '1.0',
    exportedAt,
    orgId: input.orgId,
    auditToken: input.auditToken ?? null,
    count: events.length,
    bundleHash,
    eventHashes,
    signature,
    evidenceBoundary: {
      statement:
        'This bundle is DSG-generated audit evidence for governed AI/tool execution. It is not an independent third-party certification.',
      certificationClaim: false,
      independentAuditClaim: false,
    },
    events,
  };
}
