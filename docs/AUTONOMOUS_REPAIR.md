# DSG Autonomous Repair Candidate Generation

Status: implementation branch

## What this adds

DSG can now generate exact-text repair candidates from either an OpenAI/Codex-backed provider or Anthropic Claude, then pass those candidates into the existing verified-repair chain.

```text
finding + diagnostics + user-approved file scope
→ read real source snapshots
→ Codex/OpenAI or Claude structured candidate generation
→ host-side scope/exact-text validation
→ QUBO/Ising proposal
→ Z3 exact verification
→ disposable git worktree
→ fixed validation profile
→ evidence/audit/replay
```

The model is a candidate generator only. It cannot widen `allowedFiles`, edit the base checkout, merge, deploy, or produce an authoritative production claim.

## Provider configuration

OpenAI/Codex path:

- `OPENAI_API_KEY` required
- `OPENAI_REPAIR_MODEL` recommended for the coding model used for repair generation
- `OPENAI_API_BASE` optional

Claude path:

- `ANTHROPIC_API_KEY` required
- `ANTHROPIC_REPAIR_MODEL` optional; falls back to the existing Anthropic code/general model configuration

Provider selector values:

- `auto` — use a configured provider, preferring OpenAI then Anthropic
- `codex` / `openai` — OpenAI adapter only
- `claude` / `anthropic` — Anthropic adapter only

`auto` may fall back to the second configured provider if generation from the first provider fails. The evidence record stores the actual provider/model and attempted-provider list.

## One-command flow

Prepare a request JSON containing the existing verified-repair fields except `candidates`. Example shape:

```json
{
  "jobId": "repair-example-001",
  "finding": {
    "id": "finding-001",
    "summary": "Typecheck reports an invalid return type in src/example.ts",
    "severity": "MEDIUM",
    "executionRisk": "LOW",
    "affectedFiles": ["src/example.ts"],
    "evidence": [
      {
        "id": "typecheck-001",
        "type": "test_output",
        "contentHash": "sha256:<64-hex>"
      }
    ],
    "reported": true
  },
  "allowedFiles": ["src/example.ts"],
  "diagnostics": "Paste or assemble the real compiler/test diagnostic here",
  "approvals": {
    "human": false,
    "security": false
  },
  "solver": {
    "mode": "pinned",
    "seed": 0
  }
}
```

Generate + verify plan only:

```bash
npx tsx scripts/autonomous-repair.ts \
  --request ./repair-request.json \
  --provider auto
```

Generate + run the selected repair in the controlled disposable worktree with full validation:

```bash
npx tsx scripts/autonomous-repair.ts \
  --request ./repair-request.json \
  --provider codex \
  --execute \
  --validation full \
  --output .dsg-evidence/autonomous-repair.json
```

Use `--provider claude` to force Claude. `--model` can override the configured repair model for that invocation.

## Candidate boundary

Before a generated candidate reaches QUBO/Z3, the host checks:

1. candidate file is a safe relative path;
2. file is in both `allowedFiles` and the finding's `affectedFiles`;
3. source file is read from the real checkout, not supplied by the model;
4. `expected` exists exactly once in that source snapshot;
5. replacement is not a no-op;
6. high-confidence secret-like replacement material is rejected;
7. candidate/reference ids are valid and deterministic ids are assigned by the host;
8. sensitive paths or HIGH/CRITICAL execution risk cannot be downgraded by the model.

The model's `touchesSensitive=false` cannot override host risk classification.

## Evidence

Candidate generation emits:

- provider actually used;
- model actually used;
- provider response id when available;
- attempted providers;
- prompt hash;
- diagnostics hash when supplied;
- SHA-256 hash for every source snapshot;
- raw structured-output hash;
- normalized candidate-set hash;
- candidate count.

Raw source files are not included in the generation evidence object.

## Truth boundary

`VERIFIED_IN_SIMULATION` means the selected candidate set was applied only inside a disposable worktree and the configured validation profile passed. It does **not** mean the PR branch, main branch, or production was changed.

Promotion to a real branch/PR and production release remain separate approval-controlled actions. This prevents an AI provider from turning model output directly into an unreviewed production mutation.
