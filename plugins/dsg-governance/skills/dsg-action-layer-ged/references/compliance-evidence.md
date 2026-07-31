# Compliance Evidence Pack — Reference

## What it is

The DSG Compliance Evidence Pack bundles cryptographic attestations for:
- **SBOM** (Software Bill of Materials) — every dependency at a pinned version
- **Secret Scanning** — no secrets committed (gitleaks + GitHub secret scanning)
- **CodeQL** — no high/critical security vulnerabilities in code
- **Evidence Aggregation** — L1–L5 coverage chain hashes
- **Hash Bundle** — SHA256 manifest signed over all evidence files

Unlike a plain log, this is an **evidence bundle** ready for third-party auditor review.

---

## Evidence levels (L1–L5)

| Level | Type | What it covers |
|---|---|---|
| L1 | Unit evidence | API logic, gate constraint tests |
| L2 | Integration evidence | End-to-end API + DB integration tests |
| L3 | Adversarial evidence | Replay attacks, negative cases, boundary violations |
| L4 | Mutation / Proof evidence | Stryker mutation score, design-time Z3 proofs, oversight |
| L5 | Provenance / Build evidence | SBOM, secret scan, CodeQL, Sigstore bundle (if available) |

---

## CCVS pipeline

Run locally or in CI:

```bash
npm run ccvs:pipeline
```

Generates:
- `ccvs-evidence.json` — raw evidence aggregation
- `ccvs-compliance-matrix.json` — L1–L5 matrix with pass/fail/warning
- `SHA256SUMS` — hash manifest for the evidence bundle

---

## Key files

| File | Purpose |
|---|---|
| `ccvs-evidence.json` | Evidence collected from test runs |
| `ccvs-compliance-matrix.json` | Compliance matrix by evidence level |
| `SHA256SUMS` | Hash manifest for all evidence files |
| `.gitleaks.toml` | Secret scanning configuration |
| `openapi.yaml` | API spec for auditor review |

---

## What it maps to

| Standard | DSG evidence |
|---|---|
| SOC 2 CC6.1 | CodeQL + secret scan (no credential exposure) |
| SOC 2 CC8.1 | SBOM + dependency audit |
| ISO 27001 A.12.6 | Vulnerability management via CodeQL |
| NIST CSF PR.IP-12 | Vulnerability disclosure and remediation |
| EU AI Act Art. 17 | Quality management + documentation system |
| EU AI Act Art. 13 | Transparency — policy manifest + proof hashes |

---

## Claim boundary

Evidence pack is **pre-audit evidence mapping**, not legal certification.

Allowed claims (with evidence):
- `audit-ready`
- `compliance-evidence-pack available`
- `pre-SOC2 evidence mapping`
- `EU AI Act Art. 9/13/17 documentation trail`

Not allowed without independent third-party audit:
- `SOC 2 certified`
- `ISO 27001 certified`
- `EU AI Act compliant`
- `third-party audited`

Set `certificationClaim = false` and `independentAuditClaim = false` unless a real audit artifact exists.

---

## Delivery Proof scan (quick check)

```
POST /api/delivery-proof/scan
Content-Type: application/json

{
  "productionUrl": "https://your-deployment.vercel.app",
  "repoUrl": "https://github.com/your-org/your-repo"
}
```

Returns: homepage check, readiness, health, protected-route auth rejection, repo URL presence, and a shareable report ID.

Pricing: Free (1 scan/month), Pro Scan ($49 one-time), Unlimited ($199/month).
Upgrade at `/pricing#delivery-proof`.
