# DSG Control Template Library

Purpose: provide reusable AI action governance controls for compliance buyers, consultants, security teams, and engineering teams.

Boundary: control templates support governance workflow adoption. They are not certification claims by themselves.

## Public page

```text
/controls
```

## API

```text
GET /api/gateway/controls/templates
```

## Included controls

| Control | Category | Status |
|---|---|---|
| Organization and actor identity required | identity | implemented |
| Tool registration required | runtime | implemented |
| Requested action must match registered action | runtime | implemented |
| High-risk action approval required | approval | implemented |
| Evidence writable before allow | evidence | implemented |
| Request and result hash proof | evidence | implemented |
| Customer key custody preserved | runtime | implemented |
| CI/CD deploy gate | deployment | implemented |
| Signed evidence bundle | evidence | implemented |
| PDF evidence report | evidence | planned |

## Safe wording

DSG provides reusable control templates for AI action governance, including identity checks, runtime invariants, approval gates, evidence proof, customer key custody, CI/CD deploy gates, and signed evidence bundles.

## Not claimed

- Certification by ISO, NIST, or another body
- Guaranteed compliance
- Independent third-party audit
