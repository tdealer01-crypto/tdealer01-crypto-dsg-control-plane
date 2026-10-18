# compliance-ising-z3 installation and verification

This is a **Claude Code plugin** containing skill/agent instructions. A hosted DSG Control Plane or optimization service is **not** required to install it.

## Install via marketplace

Inside Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install compliance-ising-z3@dsg-plugins
```

Or in a shell with Claude Code CLI:

```bash
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install compliance-ising-z3@dsg-plugins
claude plugin list
```

## Local development

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
claude plugin validate ./plugins/compliance-ising-z3
claude --plugin-dir ./plugins/compliance-ising-z3
```

In Claude Code, browse loaded skills and invoke `/compliance-ising-z3:z3-compliance-review`; the `qubo-optimization-run` skill is only for an external provider that **you have separately deployed and verified**. The `compliance-agent` can be invoked by delegation when available.

## What is not installed

The Kotlin/Android engine, Z3 binary, a production API, user tokens and credentials **are not bundled**. To build the native engine, clone [the engine repository](https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-) separately and follow its actual build instructions.

## Optional external API

The old default `https://dsg-qubo-api.vercel.app` is **retired/not supported**. Do **not** use it as a default or conclude it is running based on archived 2026-07-31 probe notes.

To use a new, separately verified provider, supply `DSG_QUBO_API_BASE` through the runtime environment. Make health and schema checks before any authenticated request and obtain explicit authorization for billable work. Do not pass secrets in logs.

## Verification status

Valid JSON and correct metadata types are **necessary but not sufficient** to claim installation. Confirm `claude plugin validate` and an actual marketplace install against the exact commit before reporting `INSTALL PASS`. If either fails, report the precise error.

See [README.md](README.md) and [references/external-apis.md](references/external-apis.md) for scope and archived API details.
