# DSG Verified Action Runtime v1

Status date: 2026-08-11
Product repository: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
Canonical agent front door: `/api/mcp`

## Product definition

DSG must not send a mathematically or formally verified solution directly to an LLM/agent and allow the agent to reinterpret it into side effects.

The required product pipeline is:

```text
Problem
  -> Formal Model
  -> QUBO / Ising
  -> Best Solution
  -> Exact / Z3 verification
  -> VERIFIED SOLUTION
  -> Verified Action Compiler
  -> typed Action IR
  -> dependency / mapping proof
  -> live precondition + permission + risk gates
  -> Managed Execution Runtime
  -> independent observations
  -> postcondition verification
  -> repair / rollback or counterexample
  -> Acceptance Proof
  -> FINAL RECEIPT
  -> COMPLETED
```

## Five-proof chain

1. Semantic Proof — the formalized problem preserves the user's intended requirement.
2. Encoding Proof — the formal problem is faithfully encoded into the solver representation.
3. Solution Proof — the candidate satisfies the encoded constraints / optimum claim within the verified solver boundary.
4. Action Compilation Proof — the verified solution is translated to an Action IR without parameter, constraint, or dependency drift.
5. Execution & Acceptance Proof — independent real-world observations prove the final state satisfies the acceptance contract.

A solver proof is not an execution proof. A tool success response is not an acceptance proof.

## Action IR invariant

Agent-generated free-form commands are not an execution surface. Execution actions must come from the Action Registry.

A compiled step contains at minimum:

- stable step id
- registered action/template id
- executor tool name
- typed arguments
- runtime-only bindings such as explicit approval
- dependencies
- preconditions
- declared effects
- postconditions
- rollback reference when registered

Unknown solution fields are fail-closed. The compiler must return `UNSUPPORTED` instead of dropping, changing, or guessing the mapping.

## Proof #4 requirements

### Parameter preservation

Optimizer-selected values that are mapped into executor arguments must compare canonically equal after compilation.

### Constraint preservation

Execution constraints must be either exactly verified or remain `REVIEW/BLOCK`. Unknown cost, region, destructive-migration behavior, permissions, or external capability must not be treated as safe by omission.

### Dependency correctness

Action dependencies form a validated DAG. An action may run only after its declared predecessors and live preconditions are satisfied.

### Live preconditions

A plan saying that approval, credentials, provider capacity, tests, or build status exist is not evidence that they exist. Managed runtime must inspect live state immediately before execution.

### Postconditions

Executor success does not complete a step. Independent verification must prove declared postconditions such as deployment state, health, expected revision, schema state, or generated receipt.

## Executor / verifier separation

The executor may perform the requested mutation. It must not be the sole authority that declares the mutation correct.

Independent verifier evidence must be bound to the action plan and final receipt.

## Counterexample loop

When real-world execution invalidates a simulation assumption, the runtime must emit a structured counterexample and stop autonomous reinterpretation.

```text
expected fact != observed fact
  -> execution_counterexample
  -> update model/constraints
  -> re-solve
  -> re-verify
  -> re-compile
```

The agent must not invent Plan B outside this loop.

## Receipt chain

The target final receipt binds:

```text
problemHash
formalModelHash
encodingHash
solutionHash
actionPlanHash
executionEvidenceHash
acceptanceHash
-> FINAL RECEIPT HASH
```

Changing any bound stage changes the final hash.

## Current implementation evidence boundary

### Implemented in repository

- Unified MCP front door at `/api/mcp`.
- Existing governed deployment adapters keep dispatch in `REVIEW` until downstream evidence is verified.
- `lib/mcp/verified-action-tools.ts` defines a deterministic Action Registry and exposes:
  - `dsg.action.registry`
  - `dsg.action.compile`
  - `dsg.action.verifyAcceptance`
- `/api/mcp` includes those tools in normal authenticated `tools/list` / `tools/call` routing.
- `dsg.action.compile` computes deterministic `solutionHash`, `mappingHash`, `actionPlanHash`, parameter-preservation checks, dependencies, runtime-only approval bindings, and refuses unmapped solution keys.
- `dsg.action.verifyAcceptance` verifies the Action IR hash, exact postconditions, independent-verifier evidence markers, acceptance hash, and final receipt hash when the complete upstream hash chain is supplied.

### Not yet complete

- There is not yet a dedicated Managed IR Runner that consumes the compiled DAG and invokes every executor tool itself. Existing deployment tools are governed executors, but the Action IR-to-executor runtime binding remains to be completed.
- Upstream solver proof authenticity is currently bound by supplied `proofHash`; the Action Compiler does not independently query Cinema/Z3 to re-prove that upstream result.
- Constraint preservation is not yet backed by a dedicated Action Z3 model for arbitrary cost/region/destructive-migration constraints.
- Automatic execution counterexample -> model update -> solver re-run -> recompile loop is not yet wired end-to-end.
- Acceptance verification checks supplied verifier evidence; acquisition of independent live observations remains provider/runtime-specific.

Therefore the correct current claim is:

**Verified Action Compiler and Acceptance Contract are implemented in the Unified MCP; full Managed Action Runtime closed-loop execution is PARTIAL and must not be claimed COMPLETE yet.**
