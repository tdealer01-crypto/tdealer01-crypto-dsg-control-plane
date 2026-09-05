#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
[DEPRECATED] npm publish token creation is no longer the DSG ONE CI release path.

Canonical release path:
  GitHub Actions -> npm Trusted Publishing (OIDC)
  Workflow: .github/workflows/publish-dsg-one-sdk.yml
  Package: dsg-one-sdk

Do NOT recreate expired read-write CI tokens such as "tar" or "dsg" for publishing.
The publish workflow uses short-lived OIDC credentials and does not require NPM_TOKEN.

The existing npm package is dsg-one-sdk. Do not use the unavailable @dsg-one/sdk scope.
Configure Trusted Publishing on the existing dsg-one-sdk package, then release through GitHub Actions.

If a future workflow must install private npm dependencies, create a READ-ONLY granular
access token on npmjs.com and scope it only to those dependencies. Do not use it to publish.

npm's current documentation says granular access tokens must be created on npmjs.com;
this helper intentionally does not call `npm token create`.
EOF

TOKENS_URL="https://www.npmjs.com/settings/tardealer/tokens/granular-access-tokens/new"

echo
echo "Read-only token page (only if private dependency access is actually required):"
echo "$TOKENS_URL"

if command -v am >/dev/null 2>&1; then
  read -r -p "Open npm token page in Android browser? [y/N]: " ANSWER
  case "$ANSWER" in
    y|Y)
      am start -a android.intent.action.VIEW -d "$TOKENS_URL" >/dev/null 2>&1 || true
      ;;
  esac
fi
