# compliance-ising-z3 — Claude Code plugin

Developer-facing **QUBO/Ising policy-optimization and SMT-style constraint reasoning** instructions.

The underlying Kotlin/Android engine lives in [Compliance-ising-z3-Deterministic-](https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-). This **Claude Code plugin** lives in the [DSG control-plane repository](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/tree/main/plugins/compliance-ising-z3). It bundles skill and agent instructions, **not** the engine's Android app, compiled binaries, Gradle wrapper, or a hosted solver.

## Install

In Claude Code, install from the repository's marketplace:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install compliance-ising-z3@dsg-plugins
```

In a shell with Claude Code installed, test a local checkout without publishing:

```bash
claude plugin validate ./plugins/compliance-ising-z3
claude --plugin-dir ./plugins/compliance-ising-z3
```

The plugin has **two skills and one agent**:

- `skills/z3-compliance-review/SKILL.md`: formulate candidate controls and constraints, reason about a reproducible local engine run.
- `skills/qubo-optimization-run/SKILL.md`: optional **provider-dependent** optimization API workflow; cannot execute without a separately configured and verified endpoint.
- `agents/compliance-agent.md`: guide an agent through problem formulation, evidence checks, and reporting.

To build or run the underlying Android engine, clone the engine repository separately and use its Gradle build/test instructions. Installing the Claude Code plugin alone does not run those tests.

## Runtime and claim boundaries (18 October 2026)

- No production DSG Control Plane deployment is claimed or required for **installing this plugin**.
- **Vercel services mentioned in older documentation are retired historical references, not current ready-to-use APIs.** They were previously reported as reachable on 31 July 2026. Their present availability is not verified; do not call them by default.
- Any external optimization or solver execution requires a verified current endpoint, documented schema, proper authentication, user authorization, and captured real output. Report `NOT RUN` otherwise.
- The Kotlin engine describes *Z3/SMT-style constraint logic*; this package does not prove an external Z3 binary was invoked.
- Regulatory rule mappings are engineering models; they are **not legal compliance certification**.
- Deterministic replay claims apply to **fixed inputs and fixed seed** and require matching evidence when reported.

See [INSTALL.md](INSTALL.md), [historical API notes](references/external-apis.md), and the source repository for full details.

## Report results precisely

| Claim | Evidence needed |
|---|---|
| Plugin installs | Successful Claude Code install on the exact commit |
| Skills load | Skill invocation in Claude Code |
| Kotlin engine builds | Gradle output from the engine repo |
| Optimization succeeded | Input, seed, run output and output/provenance hash |
| Production service ready | Live health, authorization and end-to-end execution evidence from the active provider |

**Plugin version:** 3.0.0. **Service status:** Not asserted; old Vercel examples are not active defaults.
