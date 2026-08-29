# DSG Control Plane — PI-Bench QUBO/Z3 Agent

This directory contains a separate AgentBeats purple-agent adapter for PI-Bench.
It is intentionally separate from the Cinema adapter so benchmark results identify
which governance stack was actually evaluated.

## Decision pipeline

```text
PI-Bench policy/context
  -> semantic normalization (model, conservative boolean contract)
  -> deterministic QUBO/Ising advisory candidate (Mulberry32 seed 42)
  -> Z3 final decision authority
  -> deterministic schema/order/decision tool gate
  -> PI-Bench tools
```

### Authority boundary

QUBO/Ising is advisory only. It does not authorize execution.

Z3 is the final authority over the normalized signal contract:

- explicit prohibition or blocked privacy release -> `DENY`
- missing/ambiguous authority, mandatory preconditions, or required review -> `ESCALATE`
- otherwise -> `ALLOW`
- Z3 unavailable/invalid -> no operational tool call

For `DENY` and `ESCALATE`, the model's reachable tool surface is reduced to
`record_decision` when that benchmark tool exists. This is deliberate protection
against under-refusal.

## Truth boundary

This adapter formally proves consistency of the **normalized boolean policy
contract**, not the semantic truth of arbitrary natural-language law or policy.
The semantic normalizer is still model-based. PI-Bench remains the independent
evaluator of whether policy interpretation and resulting state are correct.

The SHA-256 `proof_hash` is provenance over normalized inputs and the Z3 model. It
must not be described as a third-party certification or as a native Z3 proof object.

The QUBO engine in this adapter is Python. It does not claim to be the separate
native Kotlin Android implementation described in other DSG materials.

## AgentBeats registration

Use the raw Amber manifest URL pinned to a tested commit:

```text
https://raw.githubusercontent.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/<commit>/benchmarks/pibench_control_plane/amber-manifest.json5
```

Required secret:

```text
OPENAI_API_KEY
```

Recommended first full assessment:

```json
{"domain":"all"}
```

Keep the resulting submission ID, image digest, commit SHA, and 71-scenario report
as the comparison evidence against the Cinema baseline.
