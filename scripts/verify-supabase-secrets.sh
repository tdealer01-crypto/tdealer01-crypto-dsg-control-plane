#!/bin/bash
# Verification script for Supabase GitHub secrets configuration
# This script helps verify that the three required secrets are configured in GitHub Actions

set -e

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"
SECRETS_URL="https://github.com/${REPO}/settings/secrets/actions"

echo "🔍 Supabase Secrets Configuration Verification"
echo "=============================================="
echo ""
echo "To check if GitHub secrets are properly configured:"
echo ""
echo "1. Go to: $SECRETS_URL"
echo ""
echo "2. Verify these 3 secrets are present (with ✓ checkmark):"
echo "   ✓ NEXT_PUBLIC_SUPABASE_URL"
echo "   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   ✓ SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Once all 3 secrets are visible, run:"
echo "   git commit --allow-empty -m 'test: trigger CI with Supabase secrets configured'"
echo "   git push origin $(git rev-parse --abbrev-ref HEAD)"
echo ""
echo "4. Check GitHub Actions tab to verify all 8 checks pass:"
echo "   - test"
echo "   - verify"
echo "   - e2e"
echo "   - smoke-test"
echo "   - CCVS Evidence Tests"
echo "   - DSG Proof Gate"
echo "   - security"
echo "   - Vercel deployment"
echo ""
echo "Documentation reference: docs/SUPABASE_ENV_SETUP.md"
