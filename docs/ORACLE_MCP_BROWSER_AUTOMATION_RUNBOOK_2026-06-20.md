# Oracle MCP Browser Automation Runbook

Date: 2026-06-20
Scope: Oracle Cloud VM-hosted MCP browser automation worker for DSG ONE.

This runbook defines how to operate and verify a browser automation worker hosted on Oracle Cloud. It does **not** claim the worker is already live unless the health/action evidence is recorded in `docs/PRODUCTION_EVIDENCE_2026-06-20.md`.

## Purpose

Use an Oracle Cloud VM as a long-running browser automation worker outside Vercel serverless limits.

The worker can provide controlled browser actions such as:

- navigate to a URL;
- capture title/text/screenshot evidence;
- run browser simulation for DSG product flows;
- return structured action results to a DSG runtime or MCP client;
- keep heavy browser dependencies outside the Vercel production bundle.

## Recommended architecture

```text
DSG ONE / Vercel
  -> DSG auth / policy / quota / approval gate
  -> Oracle MCP Browser Worker
       -> Playwright or browser automation runtime
       -> screenshot/result artifacts
       -> structured evidence response
  -> DSG audit/evidence log
```

## Required Oracle VM baseline

Minimum practical baseline:

- Oracle Cloud VM with public IPv4 or private tunnel endpoint;
- Ubuntu 22.04/24.04 or compatible Linux;
- Node.js 20+;
- systemd service for restart-on-failure;
- firewall allowing only the expected MCP port from trusted clients;
- browser dependencies installed for Playwright/Chromium;
- logs accessible through `journalctl`.

## Environment contract

Use names like these on the Oracle worker. Do not commit secret values.

```bash
MCP_HOST=0.0.0.0
MCP_PORT=8787
MCP_AUTH_TOKEN=<server-side-token>
DSG_CONTROL_PLANE_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
DSG_WORKER_NAME=oracle-browser-mcp
BROWSER_HEADLESS=true
BROWSER_TIMEOUT_MS=30000
SCREENSHOT_DIR=/opt/dsg-mcp-browser/screenshots
LOG_LEVEL=info
```

Optional integration values:

```bash
DSG_EVIDENCE_WEBHOOK_URL=<optional evidence intake endpoint>
DSG_EVIDENCE_WEBHOOK_TOKEN=<optional token>
ALLOWED_ORIGINS=https://tdealer01-crypto-dsg-control-plane.vercel.app
```

## Required endpoints

The worker should expose at least these routes, or equivalent MCP tools:

| Endpoint / tool | Purpose | Expected pass condition |
|---|---|---|
| `GET /health` | Liveness check | HTTP 200 with `ok: true`. |
| `GET /tools` | Tool discovery | Returns available browser tools. |
| `POST /browser/navigate` | Navigate to URL | Returns success, final URL, title, and status. |
| `POST /browser/screenshot` | Capture screenshot | Returns screenshot path/id or artifact metadata. |
| `POST /browser/extract` | Extract page text/selector result | Returns bounded structured data. |

## Verification commands

Replace `<ORACLE_PUBLIC_IP>` with the worker IP or DNS name.

```bash
curl -i http://<ORACLE_PUBLIC_IP>:8787/health
```

Expected:

```text
HTTP/1.1 200 OK
{"ok":true}
```

Tool discovery:

```bash
curl -s http://<ORACLE_PUBLIC_IP>:8787/tools | head
```

Navigation smoke test:

```bash
curl -s -X POST http://<ORACLE_PUBLIC_IP>:8787/browser/navigate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"url":"https://tdealer01-crypto-dsg-control-plane.vercel.app"}'
```

Screenshot smoke test:

```bash
curl -s -X POST http://<ORACLE_PUBLIC_IP>:8787/browser/screenshot \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"url":"https://tdealer01-crypto-dsg-control-plane.vercel.app","fullPage":true}'
```

Systemd check:

```bash
sudo systemctl status dsg-mcp-browser --no-pager
sudo journalctl -u dsg-mcp-browser -n 100 --no-pager
```

## Pass/fail gate

| Check | PASS | FAIL |
|---|---|---|
| Service starts | systemd active/running | service crashed or missing |
| Health | `/health` returns 200 | timeout, 401 without expected auth flow, 5xx |
| Browser runtime | navigation returns title/final URL | Chromium/Playwright dependency failure |
| Screenshot | screenshot id/path returned | no artifact or browser crash |
| Security | token/firewall present | public unauthenticated mutation endpoint |
| DSG integration | endpoint/env recorded | hidden/manual endpoint with no evidence trail |

## DSG security requirements

The worker must not become an uncontrolled public browser bot.

Required controls:

1. authentication token or private tunnel;
2. allowlist for target hosts when running production actions;
3. timeout per action;
4. max screenshot/file size;
5. no arbitrary shell execution from browser requests;
6. logs for every action;
7. DSG approval gate before high-risk actions such as login, form submission, payment, account mutation, deletion, or deployment.

## Evidence format

After the worker passes health and action tests, append this to `docs/PRODUCTION_EVIDENCE_2026-06-20.md`:

```markdown
### 2026-06-20 — Oracle MCP Browser Automation Worker

- Source: Oracle VM + MCP health/action checks
- Instance: `<oracle-instance-name>`
- Region: `<oracle-region>`
- Endpoint: `http://<ORACLE_PUBLIC_IP>:8787`
- Result: PASS / READY
- Verified:
  - `/health` returns HTTP 200
  - `/tools` returns browser tools
  - `/browser/navigate` reaches `https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - `/browser/screenshot` returns screenshot artifact metadata
- Boundary:
  - Do not claim public SaaS browser automation until auth, firewall, rate limit, and DSG approval-gate binding are confirmed.
```

## Claim boundary

Safe wording after health/action tests pass:

> Oracle-hosted MCP browser automation worker is ready for DSG integration testing.

Do not claim:

- fully public production browser automation;
- unrestricted autonomous browsing;
- login/payment/form automation approval;
- enterprise security hardening;
- customer-ready browser execution;

unless each claim is backed by recorded evidence.
