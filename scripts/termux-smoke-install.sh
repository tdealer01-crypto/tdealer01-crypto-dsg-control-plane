#!/usr/bin/env bash
set -euo pipefail

echo "== DSG Termux smoke install =="
echo "This is NOT production release evidence."
echo "Termux/Android cannot run the full deterministic npm ci because supabase CLI postinstall does not support android arm64."
echo "Use GitHub Actions, Vercel CI, Linux, or macOS for release go/no-go."
echo

if [[ "$(uname -o 2>/dev/null || true)" != "Android" ]]; then
  echo "This helper is intended for Termux/Android only. Running standard npm ci instead."
  npm ci
  exit 0
fi

rm -rf node_modules
npm ci --ignore-scripts

missing=0
for bin in node_modules/.bin/next node_modules/.bin/vitest node_modules/.bin/tsc; do
  if [[ -x "$bin" || -f "$bin" ]]; then
    echo "✅ found $bin"
  else
    echo "❌ missing $bin"
    missing=$((missing + 1))
  fi
done

if [[ "$missing" -gt 0 ]]; then
  echo "Termux smoke install incomplete: ${missing} required binaries missing."
  exit 1
fi

echo

echo "✅ Termux smoke dependencies installed with lifecycle scripts disabled."
echo "Next safe local commands:"
echo "  npm run verify:production-manifest"
echo "  npm run typecheck"
echo "  npm run test"
echo "  npm run build"
echo

echo "Reminder: any result after --ignore-scripts is smoke-test only, not production GO evidence."
