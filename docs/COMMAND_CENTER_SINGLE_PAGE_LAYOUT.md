# Command Center Single-Page Split Layout (Verified Implementation)

Date: 2026-03-29

## Verified decision

Operational UI should stay in one page with split responsibilities:

- Left pane: Chat / Agent Console
- Right pane: Monitor / Control Panel
- Bottom section: Logs / Audit / Event Stream
- Extended observability section: Snapshot/Readiness history + Alert persistence + Trend/Forecast views
- Governance section: Concept → Runtime proof narrative

This design keeps execution and observability in one workflow and avoids context switching.

## Implemented route

- `/dashboard/command-center`

## Live data bindings used in this route

- `GET /api/health` for readiness/core status
- `GET /api/capacity` for usage envelope + projected billing
- `GET /api/usage` for plan and usage summary
- `GET /api/audit?limit=8` for latest audit/events and active alert count
- `GET /api/monitor/history` for:
  - snapshot history
  - readiness history
  - alert persistence
  - trend points (hourly)
  - forecast view (next-hour utilization + alerts)
  - governance proof mapping (determinism / auditability / zero-trust / formal reasoning)

## Cron collector endpoint

- `POST /api/monitor/history`
- Requires header: `x-monitor-collector-token: <MONITOR_COLLECTOR_TOKEN>`
- Accepts optional payload groups for `snapshot`, `readiness`, `alert`, and `trend` writes.
- Purpose: cron/system collector can persist monitor data without interactive user session.

## Scope boundary

This route introduces a unified operational surface only. It does not change:

- execution policy logic
- formal proof artifacts
- billing contract behavior
