#!/usr/bin/env bash
set -euo pipefail

# ===== CONFIG =====
DEPLOYMENT_URL="${1:-${DEPLOYMENT_URL:-https://tdealer01-crypto-dsg-control-plane-393q95ihl.vercel.app}}"
VERCEL_SCOPE="${VERCEL_SCOPE:-tdealer01-cryptos-projects}"

AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

if [ -z "$DEPLOYMENT_URL" ]; then
  echo "ERROR: missing deployment URL. Provide it as the first arg or DEPLOYMENT_URL env var." >&2
  exit 1
fi

echo "==> checking vercel cli"
if ! command -v vercel >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then
    echo "Vercel CLI not found. Installing via Termux pkg..."
    pkg install -y nodejs
    npm install -g vercel@latest
  else
    echo "Vercel CLI not found. Install with: npm i -g vercel@latest" >&2
    exit 1
  fi
fi

echo "==> vercel version"
vercel --version || true

echo "==> redeploying production deployment"
NEW_URL="$(vercel redeploy "$DEPLOYMENT_URL" --scope "$VERCEL_SCOPE" "${AUTH_ARGS[@]}")"

echo
echo "DONE"
echo "New deployment URL:"
echo "$NEW_URL"
