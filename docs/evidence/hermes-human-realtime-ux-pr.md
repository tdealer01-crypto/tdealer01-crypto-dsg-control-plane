# Hermes Human Realtime UX — PR Evidence

## Goal

Make Hermes easier to command and understand from the operator view:

```text
user goal -> clear plan -> realtime human-readable progress -> final report with evidence boundary
```

This PR does **not** claim production readiness. It only adds the first code slice for human-readable event rendering and records the remaining implementation plan.

## Five-agent parallel work split

| Agent | Workstream | Output in this PR | Remaining follow-up |
|---|---|---|---|
| Agent 1 — UX Translator | Convert SSE events into plain user language | `lib/hermes/human-event.ts` | Wire the same translator into the full `/dashboard/hermes` timeline cards |
| Agent 2 — Chat Event Renderer | Replace terse `Action plan: s1:...` text with readable Thai summaries | `lib/agent/chat-event.ts` | Add mobile timeline polish and copy/export actions for each evidence block |
| Agent 3 — Approval Flow | Review why natural text approval is confusing | Evidence note only | Implement explicit approve button/token flow instead of relying on free text |
| Agent 4 — Runtime Doctor | Diagnose capacity/latency alerts shown in screenshots | Evidence note only | Add a Runtime Doctor card for executor capacity, stale jobs, route, status, and request id |
| Agent 5 — QA/Evidence | Define acceptance checks | This evidence file | Run CI/typecheck/build and attach screenshots after deployment |

## Implemented in this PR

### 1. Human event translator

New file:

```text
lib/hermes/human-event.ts
```

It maps agent events into operator-readable messages:

- `plan` -> clear numbered plan + read-only/impact hint
- `step_start` -> “กำลังรัน…”
- `step_result` -> readable result summary + technical evidence boundary
- `step_error` -> failure + next step: inspect route/log before retry
- `done` -> completion note

### 2. Shared chat event rendering

Updated file:

```text
lib/agent/chat-event.ts
```

The renderer now uses the human translator before falling back to raw technical output.

## Truth boundary

Verified from repo inspection before this PR:

- `/dashboard/hermes` already streams SSE events from `/api/dsg/hermes/execute`.
- `AgentChatWidget` already streams events from `/api/agent-chat-v2` and formats them through `lib/agent/chat-event.ts`.
- The current problem is not missing streaming; it is that the stream is too technical and the approval/executor failure states are not explained clearly enough to the user.

## Acceptance checklist

- [ ] `npm run typecheck`
- [ ] `npm run test -- tests/unit/...` or equivalent scoped test
- [ ] `npm run build`
- [ ] Manual mobile check on `/dashboard/hermes`
- [ ] Confirm plan is shown in plain language
- [ ] Confirm step progress is shown in plain language
- [ ] Confirm raw evidence is still available and not hidden from operators
- [ ] Confirm no production-readiness claim is made from UI-only changes

## Follow-up PR slices

1. Wire `humanizeAgentEvent()` directly into `app/dashboard/hermes/page.tsx` trace cards.
2. Add Runtime Doctor panel:
   - last failed request
   - route
   - HTTP status
   - request id
   - executor current/max
   - stale job hint
3. Replace floating `DSG Agent v2` confusion on `/dashboard/hermes` with a single primary Hermes console.
4. Add explicit read-only approval button with auditable token issuance.
5. Add screenshots and CI logs as evidence after Vercel preview is available.
