# DSG Breach Signal Sandbox Test Plan

Status: design + unit-test scaffold only. This document does not authorize autonomous dark-web browsing, Tor crawling, dump downloading, credential use, wallet use, payment, login, or production claims.

## Goal

Add a deterministic policy gate for breach-signal intake so DSG can help owners understand what may have leaked without storing stolen raw data.

The gate is intentionally scoped to redacted evidence, metadata, hashes, and owner-side confirmation. It is not a dark-web crawler and must not become a data-dump collector.

## Safety Boundary

Allowed inputs:

- owner scope such as domain, repo, brand, or system name
- legal purpose such as owner notification or breach prevention
- source category, not full illegal source content
- masked samples such as `som***@example.com`
- hash proofs such as `sha256:...`
- claimed data types such as `email`, `hashed_password`, or `api_key`
- owner/provider/internal confirmation flags

Blocked inputs/actions:

- raw stolen data
- full database dumps
- full password, token, private key, API key, session token, payment data, or private records
- login/payment/download requirements
- autonomous Tor/dark-web browsing
- unknown network route without review

## Decision Model

| Condition | Decision |
| --- | --- |
| Missing owner scope | BLOCK |
| Missing legal purpose | BLOCK |
| Raw data included | BLOCK |
| Full dump included | BLOCK |
| Source requires login/payment/download | BLOCK |
| Autonomous agent access | BLOCK |
| Autonomous access over Tor | BLOCK |
| Masked evidence only, no owner confirmation | REVIEW |
| Owner confirmation present | INCIDENT_REPORT_ALLOWED |
| Provider/internal log confirmation present | INCIDENT_REPORT_ALLOWED |

## Evidence Levels

| Level | Meaning |
| --- | --- |
| L0 | No credible evidence yet |
| L1 | Owner/source category mentioned |
| L2 | Masked sample or hash exists |
| L3 | Owner confirmed sample/hash matches their system |
| L4 | Provider or internal logs confirm incident |

## Severity Model

| Severity | Claimed data type examples |
| --- | --- |
| LOW | brand/domain mention only |
| MEDIUM | email, username, employee name |
| HIGH | hashed password, phone, internal endpoint, customer table/record |
| CRITICAL | API key, private key, session token, admin credential, payment data, production secret |

## Unit Test Coverage Added

File: `tests/unit/dsg/breach-signal-policy.test.ts`

Covers:

1. blocks raw stolen data and full dumps
2. blocks autonomous Tor access even with a legitimate-looking purpose
3. returns REVIEW for masked evidence without owner confirmation
4. allows incident report only after owner confirmation or stronger evidence
5. blocks when owner scope or legal purpose is missing

## Local/Sandbox Commands

Recommended local verification commands after checkout:

```bash
npm run typecheck
npx vitest run tests/unit/dsg/breach-signal-policy.test.ts
```

Broader repo checks before merge:

```bash
npm run test:unit
npm run test
npm run build
```

## Truth Boundary

This PR does not prove production readiness and does not add a production breach-monitoring service. It only adds a deterministic policy gate and unit tests for safe breach-signal intake behavior.
