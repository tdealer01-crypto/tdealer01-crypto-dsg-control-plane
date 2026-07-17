---
name: dsg-marketplace-fix
description: >-
  Remediation skill for shipping the DSG Governance Control Plane to the Claude Code
  plugin marketplace. Fixes the two remaining blockers after the marketplace.json owner
  merge: (1) the premature Claude.ai README claim on lines 12-13, and (2) verifying the
  OAuth authorization-server endpoint is live in production (not 404). Use when the user
  says "fix the marketplace", "แก้ marketplace", "deploy and verify OAuth", or "finish the
  marketplace listing".
  Trigger phrases: "fix marketplace", "แก้ marketplace", "verify oauth endpoint", "finish marketplace listing"
version: 1.0.0
author: DSG Team
license: MIT
metadata:
  hermes:
    tags:
      - marketplace
      - remediation
      - oauth
      - governance
---

# DSG Marketplace Fix

Closes the remaining marketplace-launch blockers after `owner` was merged into
`.claude-plugin/marketplace.json` (commit `b08d3fc`).

## Status snapshot

| Item | File | Status |
|------|------|--------|
| `owner` object | `.claude-plugin/marketplace.json` (lines 6-9) | ✅ Done — on main |
| Premature README claim | `.claude-plugin/README.md` (lines 12-13) | ❌ Still needs edit |
| OAuth endpoint live | production `/.well-known/oauth-authorization-server` | ⚠️ Verify after deploy |

## Step 1 — Fix the README claim

Replace lines 12-13 of `.claude-plugin/README.md`:

Before:
```markdown
### Claude.ai
Visit the Claude Code plugin marketplace and search for "DSG Governance Control Plane"
```

After:
```markdown
### Claude.ai
Marketplace listing coming soon. For now, add the marketplace directly via the Claude Code CLI command above.
```

## Step 2 — Deploy

```bash
vercel --prod
```

## Step 3 — Verify OAuth endpoint (wait 2-3 min)

```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/.well-known/oauth-authorization-server \
  | python3 -m json.tool
```

Expected: HTTP 200 with authorization-server metadata (issuer, authorization_endpoint,
token_endpoint, revocation_endpoint). If 404 → clear Vercel build cache and redeploy.

## Done when

- `README.md` lines 12-13 = "coming soon" copy
- `curl` returns 200 JSON (not 404)
- `claude plugin add https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane` loads `dsg-governance`

## Verification Checklist

- [ ] README.md edited: lines 12-13 updated to "coming soon"
- [ ] Commit + push: `git add .claude-plugin/README.md && git commit -m "fix: soften README marketplace claim" && git push origin main`
- [ ] Vercel deploy: `vercel --prod` (wait 2-3 min for build)
- [ ] OAuth metadata: `curl` returns 200 JSON with `authorization_endpoint`, not 404
- [ ] CLI works: `claude plugin marketplace add https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane` succeeds

## Next Steps After Fix

Once all checks pass:
1. Marketplace will be discoverable via Claude Code CLI
2. Users can add DSG Governance Control Plane with `claude plugin add`
3. OAuth 2.0 remote connector setup available for claude.ai integration
4. Document in product announcement: "DSG Governance now available in Claude Code plugin marketplace"
