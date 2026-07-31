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
