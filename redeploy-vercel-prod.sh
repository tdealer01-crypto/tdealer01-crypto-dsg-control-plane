#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# ===== CONFIG =====
DEPLOYMENT_URL="https://tdealer01-crypto-dsg-control-plane-393q95ihl.vercel.app"
VERCEL_SCOPE="tdealer01-cryptos-projects"

AUTH_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS+=(--token "$VERCEL_TOKEN")
fi

echo "==> checking vercel cli"
if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Installing..."
  pkg install -y nodejs
  npm install -g vercel@latest
fi

echo "==> vercel version"
vercel --version || true

echo "==> redeploying production deployment"
NEW_URL="$(vercel redeploy "$DEPLOYMENT_URL" --scope "$VERCEL_SCOPE" "${AUTH_ARGS[@]}")"

echo
echo "DONE"
echo "New deployment URL:"
echo "$NEW_URL"
