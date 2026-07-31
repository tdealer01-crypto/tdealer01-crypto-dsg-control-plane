# compliance-ising-z3

A local Claude Code plugin bundled from the source repository
[`tdealer01-crypto/Compliance-ising-z3-Deterministic-`](https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-)
(branch `main`).

The source repo is a native Kotlin/Android engine that performs deterministic
QUBO/Ising policy optimization and Z3/SMT-style formal constraint verification.
This plugin bundles the **agent-facing content** (a skill and an agent) plus
the two reference build/test helper scripts, so an agent can reason about and
drive the engine. It does **not** bundle the Android app source, Gradle
wrapper, assets, or binaries.

## Components

- `skills/z3-compliance-review/SKILL.md` — how to frame a policy problem, pick
  constraint forms, run the engine at a fixed seed, and report a replayable,
  hash-chained decision.
- `agents/compliance-agent.md` — subagent for deterministic QUBO/Z3 workflows.
- `skills/qubo-optimization-run/SKILL.md` — how to call the externally deployed
  DSG QUBO Policy Optimizer API (see below).
- `references/external-apis.md` — full endpoint inventory for both deployed
  APIs, with verification dates and curl templates.
- `scripts/preBuild.sh`, `scripts/postTest.sh` — advisory preflight / post-test
  helper scripts carried over from the source repo, callable via
  `${CLAUDE_PLUGIN_ROOT}/scripts/...`.

## Running the underlying engine

The engine itself lives in the source repo and is built with Gradle:

```bash
./gradlew :app:build --no-daemon
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace
```

Key source locations in that repo:

- `app/src/main/java/com/example/data/qubo/` — `QuboModels.kt`,
  `QuboPolicyEngine.kt`, `DeterministicRNG.kt`
- `app/src/main/java/com/example/data/mcp/McpGatewayEngine.kt`

## External deployed APIs

Two externally deployed REST services relate to this domain. They are separate
hosted services, not code in this repo. This plugin documents them and provides
curl templates only — it stores no `api_key` and performs no real solver POST.
Full details and verification dates are in `references/external-apis.md`.

- **DSG QUBO Policy Optimizer API** (ready) — `https://dsg-qubo-api.vercel.app`.
  Health check: `GET /health` returned
  `{"status":"healthy","version":"2.0.0",...}` (verified reachable 2026-07-31).
  Auth is an `api_key` **query parameter**. Set these env vars at runtime:
  - `DSG_QUBO_API_BASE` (default `https://dsg-qubo-api.vercel.app`)
  - `DSG_QUBO_API_KEY` — obtain via `/api/v1/auth/register` or `/login`; provide
    from the runtime environment, never committed to the repo.
  See `skills/qubo-optimization-run/SKILL.md`.

- **z3-solver-api** (partially verified) —
  `https://z3-solver-api-deploy-dsg.vercel.app`. `POST /api/solve` route exists
  (POST-only; `GET` → 405), verified 2026-07-31. Its request/response
  **schema is not verified** — do not assume a payload shape.

Claim boundary: these are external deployed services, production-connected,
reachable via `/health` where noted. No real optimization/solver run has been
executed from this repo, so do not claim "external Z3 solver invocation
complete", certification, or any readiness status.

## Claim boundary

- Z3/SMT-style constraint checks are implemented in Kotlin; there is no
  external Z3 solver process. Do not claim external production Z3 invocation.
- Determinism holds for a fixed seed and fixed inputs.
- Regulatory mappings are engineering models, not legal certification.

## Provenance note

The source repo shipped its own custom-schema plugin manifest
(`.claude-plugin/plugins/ising-agent/` with `SKILL.json` / `.json` agents and
`preBuild`/`postTest` hooks) that does not conform to the official Claude Code
plugin schema. This bundle re-expresses the same content in the official format
(`SKILL.md` + agent `.md` with YAML frontmatter) so it validates with
`claude plugin validate`. No secrets or `.env` files were bundled.
