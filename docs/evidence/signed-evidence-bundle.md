# DSG Signed Evidence Bundle

Purpose: provide a portable JSON evidence package for governed AI/tool execution.

Boundary: this bundle is DSG-generated audit evidence. It is not an independent third-party certification or audit report.

## Endpoint

```text
GET /api/gateway/evidence/bundle?orgId=<org-id>
GET /api/gateway/evidence/bundle?orgId=<org-id>&auditToken=<audit-token>
```

## Output fields

| Field | Meaning |
|---|---|
| `type` | Bundle type: `dsg-gateway-signed-evidence-bundle` |
| `version` | Bundle schema version |
| `exportedAt` | Export timestamp |
| `orgId` | Organization scope |
| `auditToken` | Optional event filter |
| `count` | Number of events in the bundle |
| `bundleHash` | Stable SHA256 hash over bundle content |
| `eventHashes` | Stable SHA256 hash for each event |
| `signature.algorithm` | `hmac-sha256` if signing secret exists, otherwise `sha256` |
| `signature.signatureMode` | `hmac` or `hash-only` |
| `signature.keyId` | Signing key identifier |
| `events` | Raw audit events included in the bundle |

## Signing behavior

If `DSG_EVIDENCE_SIGNING_SECRET` is configured, DSG signs the bundle hash using HMAC-SHA256.

Optional key id:

```text
DSG_EVIDENCE_SIGNING_KEY_ID
```

If no signing secret is configured, DSG still returns a deterministic `bundleHash` and `eventHashes`, but `signatureMode` is `hash-only`.

## Sample

```json
{
  "ok": true,
  "type": "dsg-gateway-signed-evidence-bundle",
  "version": "1.0",
  "orgId": "org-smoke",
  "count": 1,
  "bundleHash": "sha256-bundle-placeholder",
  "eventHashes": ["sha256-event-placeholder"],
  "signature": {
    "algorithm": "hmac-sha256",
    "signature": "hmac-signature-placeholder",
    "signatureMode": "hmac",
    "keyId": "env:DSG_EVIDENCE_SIGNING_SECRET"
  },
  "evidenceBoundary": {
    "certificationClaim": false,
    "independentAuditClaim": false
  },
  "events": []
}
```

## Safe wording

DSG provides portable signed evidence bundles for governed AI/tool execution, including bundle hashes, event hashes, and signing metadata.

## Not claimed

- Independent third-party certification
- ISO certification
- NIST certification
- Guaranteed compliance
