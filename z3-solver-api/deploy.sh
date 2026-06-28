#!/bin/bash
set -euo pipefail

# ── Z3 Solver API — one-command deploy helper ──────────────────────────────
# Prerequisites (run once on your machine):
#   1. Install Vercel CLI:   npm i -g vercel
#   2. Authenticate:         vercel login
#
# Usage:
#   bash deploy.sh
#
# This script:
#   1. Installs dependencies (npm ci)
#   2. Deploys this directory to Vercel production
#   3. Prints the production URL and the exact env vars to set on the main app
# ───────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 Z3 Solver API — deploy"
echo "========================="

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not found. Install it first:  npm i -g vercel"
  echo "   Then authenticate:  vercel login"
  exit 1
fi

echo "📦 Installing dependencies..."
npm ci

echo "🚀 Deploying to Vercel (production)..."
# --yes accepts project-link defaults non-interactively after first link.
DEPLOY_URL="$(vercel deploy --prod --yes 2>&1 | tee /dev/stderr | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)"

if [ -z "${DEPLOY_URL:-}" ]; then
  echo "⚠️  Could not auto-detect the deployment URL from CLI output."
  echo "    Copy the Production URL printed above and append /api/solve."
  exit 0
fi

SOLVER_ENDPOINT="${DEPLOY_URL}/api/solve"

echo ""
echo "✅ Deployed: ${DEPLOY_URL}"
echo "   Endpoint: ${SOLVER_ENDPOINT}"
echo ""
echo "🔎 Smoke test (Simple SAT)..."
curl -s -X POST "${SOLVER_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"smt2":"(set-logic QF_LIA)(declare-fun x () Int)(assert (> x 5))(check-sat)","timeout_ms":5000}' \
  || echo "(smoke test request failed — verify manually)"
echo ""
echo ""
echo "────────────────────────────────────────────────────────────────"
echo "Next: set these env vars on the MAIN app project in Vercel,"
echo "then redeploy the main app:"
echo ""
echo "  DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true"
echo "  DSG_EXTERNAL_SOLVER_URL=${SOLVER_ENDPOINT}"
echo "  DSG_SOLVER_TIMEOUT_MS=5000"
echo "  DSG_DETERMINISTIC_SOLVER_NAME=z3"
echo "  DSG_DETERMINISTIC_SOLVER_VERSION=4.16.0"
echo "────────────────────────────────────────────────────────────────"
