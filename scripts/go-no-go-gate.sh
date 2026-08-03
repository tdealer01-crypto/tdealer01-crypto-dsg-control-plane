#!/usr/bin/env bash
# Phase 5: Production GO/NO-GO Gate
#
# Wrapper script for the production-gate.ts TypeScript implementation.
# This script provides a unified production readiness check with automated
# decision logic and audit trail recording.

set -e

PRODUCTION_URL="${1:-}"

if [[ -z "$PRODUCTION_URL" ]]; then
  echo "Phase 5: Production GO/NO-GO Gate"
  echo ""
  echo "Usage: npm run go:no-go <production-url>"
  echo ""
  echo "Example:"
  echo "  npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app"
  echo ""
  echo "The gate performs 8 checks:"
  echo "  1. Environment Variables (SUPABASE_URL, API keys, etc.)"
  echo "  2. Public Health Probe (/api/health)"
  echo "  3. Readiness Probe (/api/readiness)"
  echo "  4. Agent Status Probe (/api/agent/status)"
  echo "  5. Database Connectivity (Supabase)"
  echo "  6. Migration State (Supabase schema_migrations)"
  echo "  7. Vercel Deployment Status (optional)"
  echo "  8. Cache Health (optional)"
  echo ""
  echo "Decision:"
  echo "  GO      - All checks passed, safe to deploy"
  echo "  NO-GO   - One or more checks failed, deployment blocked"
  echo "  REVIEW  - Some checks skipped (missing credentials), manual approval needed"
  echo ""
  exit 1
fi

# Run the TypeScript production gate implementation
# The TypeScript implementation provides:
# - Structured checks with latency tracking
# - Machine-readable JSON output
# - Human-readable summary
# - Audit trail recording
npx ts-node scripts/production-gate.ts "$PRODUCTION_URL"
