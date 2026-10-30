# Legacy Control Plane dependency audit — verified candidate (2026-10-30 UTC)

## Scope and boundaries
- Repository: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` (retired as DSG production backend). **No Vercel/Azure/AWS runtime deployment**.
- Objective: remove blocking dependency advisories without `npm audit fix --force` or disabling repository security gates.
- This is a **candidate PR source audit**, not deployed runtime evidence or a cryptographic signature.
- The public Claude package fix remains [PR #1252](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/pull/1252); no production OAuth, Claude-client execute, or signed provider E2E is asserted here.

## Actual CI evidence
- Baseline [Run #41091499386](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41091499386): blocking production dependency audit reported **21 vulnerabilities (6 moderate, 12 high, 3 critical)** on the original manifest/lock.
- Isolated remediation [Run #41093619224](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41093619224): non-force candidate reduced production audit findings to **5 (4 high, 1 critical)**, with TypeScript and integration tests passing.
- Isolated remediation [Run #41094517256](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41094517256): patched Sentry and js-yaml, reduced to **2 (2 high, 0 critical)**. [Audit artifact](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41094517256/artifacts/12996675320).
- Final isolated remediation [Run #41096337570](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41096337570) **SUCCESS**: TypeScript, integration tests and unit tests passed and `npm audit --audit-level=high --omit=dev` exited **0**. The actual `audit-after.json` showed **0 total (0 low, 0 moderate, 0 high, 0 critical)**. [Audit artifact](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions/runs/41096337570/artifacts/12995543450).
- Candidate dependency commit: `6ffc718070f907664f2ed2d76945725d004bd4d1`.
- Temporary branch-write CI workflow removed in commit `05c1a99713330fe806312d6e9b0711e3c4608eaf`; the final PR does **not** ship the temporary writer workflow.

## Audited package inputs
- `@sentry/nextjs`: `^10.75.2` (patched within major 10)
- `js-yaml` override: `4.3.2`
- `openai`: `^7.45.1` (major upgrade from `^4.54.0`)
- `zod` override: `4.6.7` (major upgrade applied across the dependency tree)
- The committed lockfile is the exact resolved dependency graph used in the candidate install-and-test CI.

## Release decision
**NOT RELEASED / REVIEW REQUIRED.** A clean npm audit for a checked-out PR is not proof of application runtime behavior, absence of all vulnerabilities, or compatibility with every authenticated integration. In particular, OpenAI SDK 7.x and Zod 4.x are major updates. The independent full legacy CI, security workflow and app smoke checks must be re-verified on the final PR head before merge. Review any branch/protection or retired Vercel status contexts rather than disabling them as a workaround. Keep [PR #1253](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/pull/1253) as context for the exact TypeScript/integration baseline fixes until supersession is independently confirmed.
