# DSG Agent Command Gate Go-Live Evidence

Date: 2026-05-09
Branch: `audit/governance-runtime-hardening`
Supabase project: `dsg-control-plane-dev` (`zeyguilldygozufpgxms`)

## Scope

This evidence record covers the DSG agent command gate persistence hardening work:

1. Durable `dsg_agent_command_gate_decisions` table for gate decisions.
2. Durable `dsg_agent_action_result_receipts` table for agent execution result callbacks.
3. Authenticated route guards using `requireOrgPermission('org.execute')`.
4. Runtime inserts before returning API responses.
5. Live smoke test script for PASS, BLOCK, and result receipt flows.

## Supabase migration evidence

Migration applied to active Supabase project:

- Initial attempt failed with `operator does not exist: uuid = text` in RLS policy comparison.
- Corrected migration `create_dsg_agent_command_gate_v2` was applied successfully.

Verification SQL results observed after migration:

```json
{
  "decisions_table": "dsg_agent_command_gate_decisions",
  "receipts_table": "dsg_agent_action_result_receipts"
}
```

Column count verification:

```json
[
  { "table_name": "dsg_agent_action_result_receipts", "column_count": 17 },
  { "table_name": "dsg_agent_command_gate_decisions", "column_count": 20 }
]
```

RLS policy verification:

```json
[
  {
    "tablename": "dsg_agent_action_result_receipts",
    "policyname": "dsg_agent_action_result_receipts_org_select",
    "cmd": "SELECT"
  },
  {
    "tablename": "dsg_agent_command_gate_decisions",
    "policyname": "dsg_agent_command_gate_decisions_org_select",
    "cmd": "SELECT"
  }
]
```

Append-only trigger verification showed update/delete triggers on both tables:

- `trg_dsg_agent_action_result_receipts_no_delete`
- `trg_dsg_agent_action_result_receipts_no_update`
- `trg_dsg_agent_command_gate_decisions_no_delete`
- `trg_dsg_agent_command_gate_decisions_no_update`

## Route hardening evidence

Routes patched in this branch:

- `app/api/dsg/agent-command-gate/route.ts`
- `app/api/dsg/agent-command-gate/result/route.ts`

Both routes now:

- call `requireOrgPermission('org.execute')` before processing;
- reject requests where `workspaceId` does not equal authenticated `orgId`;
- persist DB records before returning success/error outcome;
- return explicit `persisted: true` only after insert succeeds;
- keep claim boundary text in the response.

## Live smoke command

Run against a deployed authenticated environment:

```bash
PLAYWRIGHT_BASE_URL="https://<deployment-url>" \
DSG_SMOKE_ORG_ID="<org-id>" \
DSG_SESSION_COOKIE="<authenticated-session-cookie>" \
npm run smoke:agent-command-gate:live
```

Expected success output shape:

```json
{
  "ok": true,
  "baseUrl": "https://<deployment-url>",
  "checks": {
    "passDecisionHash": "...",
    "blockDecisionHash": "...",
    "receiptHash": "..."
  }
}
```

## Go-live boundary

Current status: **not enterprise-certified and not final production go-live**.

This branch proves database schema application and code-path persistence changes, but go-live remains blocked until all of these are attached as fresh evidence:

- `npm run typecheck` passes on the branch.
- `npm run build` passes on the branch.
- `npm run smoke:agent-command-gate:live` passes against the intended deployment.
- Supabase row-count verification confirms one PASS decision, one BLOCK decision, and one result receipt from the smoke run.
- Operator confirms no claim of third-party certification, WORM compliance, or enterprise-ready status beyond evidence shown here.
