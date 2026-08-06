# Gateway Market Comparison Matrix

This document defines a fair comparison method for DSG Gateway and adjacent market tools.

## Important boundary

Do not claim DSG is better than Zapier, Make, n8n, Workato, LangSmith, or any other vendor based on unrelated benchmarks.

A valid comparison requires:

- same workload
- same criteria
- same scoring rubric
- same evidence standard
- clear environment notes

## Positioning

DSG is not trying to win on connector count.

DSG's strongest position is:

```text
Govern high-risk AI/tool actions before execution,
then record tamper-evident audit proof after execution,
without requiring customers to give DSG custody of their production API keys.
```

## Capability matrix

| Criterion | DSG Gateway | Zapier / Make | n8n | Workato | LangSmith / tracing stack |
|---|---|---|---|---|---|
| Pre-execution policy gate | Native Monitor/Gateway Mode | Usually custom workflow logic | Possible with custom nodes | Enterprise policy patterns | Mostly tracing/eval, not execution gate |
| Tool/action risk classification | Native gateway tool registry | Custom fields/paths | Custom implementation | Enterprise rules/policies | Not primary focus |
| Human approval gate | Pattern supported; general UI expanding | Possible via workflow steps/plans | Custom workflow | Strong enterprise support | Not primary focus |
| Customer keeps API keys | Native Monitor Mode | Depends on workflow/app auth | Strong if self-hosted | Depends on deployment | Depends on integration |
| Connector execution | Custom HTTP now; providers later | Strong connector ecosystem | Strong/custom/self-host | Strong enterprise connectors | Not primary focus |
| Audit hash proof | Native requestHash/recordHash | Not usually core proof primitive | Custom | Audit logs, not necessarily hash proof | Traces/evals, not hash proof |
| Audit export | Native JSON export | Export depends on plan/setup | Custom | Enterprise audit/reporting | Trace export patterns |
| Replay/history visibility | Monitor UI/events | Task history | Execution history | Enterprise history | Strong tracing history |
| Fail-closed behavior | Explicit design goal | Depends on workflow | Custom | Enterprise policies | Depends on integration |
| Public reproducible benchmark | `npm run benchmark:gateway` | Must build same suite | Must build same suite | Must build same suite | Must build same suite |

## Benchmark suite

The canonical suite definition lives at:

```text
benchmarks/gateway-comparison/suite.json
```

Run DSG's submitted score:

```bash
npm run benchmark:gateway:compare
```

Generated outputs:

```text
artifacts/gateway-comparison/gateway-comparison-result.json
artifacts/gateway-comparison/gateway-comparison-report.md
```

## DSG current submitted score

DSG's submitted score is stored in:

```text
benchmarks/gateway-comparison/dsg-score.json
```

Current scoring summary:

```text
Weighted score: 188 / 200
Percent: 94%
```

This score is based on DSG's available evidence and conservative scoring. Human approval is scored as partial because the generalized gateway approval UX is not yet fully productized across all tools.

## Fair use wording

Use:

```text
DSG has a 94% submitted score against its public AI Action Governance Gateway comparison rubric.
```

Do not use:

```text
DSG is 94% better than Zapier.
DSG beats Workato.
DSG is certified best-in-market.
```

Those claims require vendor-run evidence using the same suite and ideally independent review.
