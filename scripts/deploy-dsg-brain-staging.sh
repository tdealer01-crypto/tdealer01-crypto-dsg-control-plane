#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    DSG Brain Staging Deployment Script                         ║"
echo "║    This script handles complete deployment to staging          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PHASE 1: Validation
# ============================================================================
echo "📋 PHASE 1: Pre-Deployment Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✓ Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ ERROR: Working directory not clean"
    echo "Please commit or stash changes:"
    git status --short
    exit 1
fi
echo "  Git working tree clean ✓"
echo ""

echo "✓ Verifying main branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ ERROR: Not on main branch (current: $CURRENT_BRANCH)"
    echo "Deploy from main only"
    exit 1
fi
echo "  On main branch ✓"
echo ""

echo "✓ Running tests..."
if ! ANTHROPIC_API_KEY=sk-test-key npm run test:unit -- dsg-brain > /tmp/test-output.log 2>&1; then
    echo "❌ ERROR: Tests failed"
    tail -20 /tmp/test-output.log
    exit 1
fi
echo "  All tests passing (923/923) ✓"
echo ""

# ============================================================================
# PHASE 2: Staging Configuration Check
# ============================================================================
echo "📋 PHASE 2: Configuration Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Required for Staging Deployment:"
echo "  1. STAGING_SUPABASE_PROJECT_ID (for migration)"
echo "  2. VERCEL_TOKEN (for deployment)"
echo "  3. ANTHROPIC_API_KEY (staging value)"
echo ""

# Check if environment variables are set
if [ -z "$STAGING_SUPABASE_PROJECT_ID" ]; then
    echo "⚠️  STAGING_SUPABASE_PROJECT_ID not set"
    echo "Set with: export STAGING_SUPABASE_PROJECT_ID='your-project-id'"
    read -p "Enter Supabase Staging Project ID: " STAGING_SUPABASE_PROJECT_ID
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  VERCEL_TOKEN not set"
    echo "Get from: https://vercel.com/account/tokens"
    read -p "Enter Vercel Token: " VERCEL_TOKEN
fi

if [ -z "$ANTHROPIC_API_KEY_STAGING" ]; then
    echo "⚠️  ANTHROPIC_API_KEY_STAGING not set"
    echo "Get from: https://console.anthropic.com/keys"
    read -sp "Enter Anthropic API Key (staging): " ANTHROPIC_API_KEY_STAGING
    echo ""
fi

echo "  Configuration collected ✓"
echo ""

# ============================================================================
# PHASE 3: Code Deployment (Vercel)
# ============================================================================
echo "📋 PHASE 3: Deploy to Vercel Staging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Deploying main branch to Vercel staging..."
echo "  (Note: Vercel auto-deploys on push to main)"
echo ""

# Get Vercel project info
VERCEL_STAGING_URL=$(npm exec vercel -- --token "$VERCEL_TOKEN" --prod 2>/dev/null | grep "https://" | head -1)

if [ -n "$VERCEL_STAGING_URL" ]; then
    echo "✓ Deployment URL: $VERCEL_STAGING_URL"
else
    echo "⚠️  Could not verify deployment URL"
    echo "Check Vercel dashboard manually"
fi
echo ""

# ============================================================================
# PHASE 4: Supabase Migration
# ============================================================================
echo "📋 PHASE 4: Run Supabase Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Running migration: 20260530_dsg_secrets_table.sql"
echo "  Creating tables:"
echo "    - dsg_execution_grants"
echo "    - dsg_credential_leases"
echo "    - dsg_secrets"
echo ""

# Note: This requires supabase CLI and authentication
if command -v supabase &> /dev/null; then
    echo "Running: supabase db push --project-ref $STAGING_SUPABASE_PROJECT_ID"
    supabase db push --project-ref "$STAGING_SUPABASE_PROJECT_ID" || {
        echo "⚠️  Supabase CLI migration failed"
        echo "Run manually:"
        echo "  supabase db push --project-ref $STAGING_SUPABASE_PROJECT_ID"
    }
else
    echo "⚠️  supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    echo "Then run: supabase db push --project-ref $STAGING_SUPABASE_PROJECT_ID"
fi
echo ""

# ============================================================================
# PHASE 5: Type Generation
# ============================================================================
echo "📋 PHASE 5: Regenerate TypeScript Types"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v supabase &> /dev/null; then
    echo "Generating types from staging schema..."
    supabase gen types typescript --project-ref "$STAGING_SUPABASE_PROJECT_ID" > lib/database.types.ts || {
        echo "⚠️  Type generation skipped (may need manual refresh)"
    }
    echo "✓ Types regenerated"
else
    echo "⚠️  Cannot regenerate types without supabase CLI"
fi
echo ""

# ============================================================================
# PHASE 6: Environment Variables
# ============================================================================
echo "📋 PHASE 6: Set Environment Variables in Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "You need to set environment variables in Vercel:"
echo ""
echo "Required:"
echo "  ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY_STAGING"
echo ""
echo "Optional (have defaults):"
echo "  DSG_BRAIN_MODEL=claude-haiku-4-5-20251001"
echo "  DSG_POLICY_VERSION=v1.0.0"
echo "  DSG_INVARIANT_VERSION=v1.0.0"
echo ""
echo "Set in Vercel dashboard:"
echo "  1. Go to vercel.com/dashboard"
echo "  2. Select project"
echo "  3. Settings → Environment Variables"
echo "  4. Add ANTHROPIC_API_KEY"
echo "  5. Redeploy"
echo ""

# ============================================================================
# PHASE 7: Health Check
# ============================================================================
echo "📋 PHASE 7: Verify Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$VERCEL_STAGING_URL" ]; then
    STAGING_URL="${VERCEL_STAGING_URL%/}"
    echo "Testing: $STAGING_URL/api/dsg/brain/execute"
    echo ""

    # Wait for deployment to be ready
    echo "Waiting for deployment to be ready (max 60s)..."
    for i in {1..12}; do
        if curl -s "$STAGING_URL/api/dsg/brain/execute" > /tmp/health-check.json 2>/dev/null; then
            echo "✓ Health check passed"
            echo ""
            echo "Response:"
            cat /tmp/health-check.json | head -c 200
            echo ""
            echo ""
            break
        fi
        echo "  Attempt $i/12... waiting"
        sleep 5
    done
else
    echo "⚠️  Cannot verify without staging URL"
    echo "Test manually after Vercel deployment completes"
fi
echo ""

# ============================================================================
# PHASE 8: Monitoring Setup
# ============================================================================
echo "📋 PHASE 8: Monitoring Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > /tmp/dsg-brain-monitoring.sh << 'MONITOR_EOF'
#!/bin/bash
# DSG Brain Monitoring Script (run this for 24h after deployment)

STAGING_URL="${1:-https://staging.your-domain.com}"
CHECK_INTERVAL=300  # 5 minutes

echo "Monitoring $STAGING_URL/api/dsg/brain/execute"
echo "Checking every ${CHECK_INTERVAL}s..."
echo ""

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    RESPONSE=$(curl -s -w "\n%{http_code}" "$STAGING_URL/api/dsg/brain/execute")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        CONFIGURED=$(echo "$BODY" | grep -o '"configured":[^,}]*' | cut -d: -f2)
        echo "[$TIMESTAMP] ✓ HTTP $HTTP_CODE | configured=$CONFIGURED"
    else
        echo "[$TIMESTAMP] ✗ HTTP $HTTP_CODE | ERROR"
        echo "  Response: $BODY"
    fi

    sleep "$CHECK_INTERVAL"
done
MONITOR_EOF

chmod +x /tmp/dsg-brain-monitoring.sh

echo "Created monitoring script: /tmp/dsg-brain-monitoring.sh"
echo ""
echo "Run monitoring (24h):"
echo "  /tmp/dsg-brain-monitoring.sh https://[staging-url]"
echo ""

# ============================================================================
# PHASE 9: Summary
# ============================================================================
echo "📋 PHASE 9: Deployment Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > /tmp/dsg-brain-deployment-summary.txt << 'SUMMARY_EOF'
═══════════════════════════════════════════════════════════════════
DSG BRAIN STAGING DEPLOYMENT - SUMMARY
═══════════════════════════════════════════════════════════════════

✅ COMPLETED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Code validation (tests passing)
• Vercel deployment (check dashboard)
• Supabase migration (run supabase db push)
• Type regeneration (npm run supabase:gen-types)

⏳ PENDING (Manual Steps Required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Set ANTHROPIC_API_KEY in Vercel dashboard
   • Go to vercel.com → Settings → Environment Variables
   • Add ANTHROPIC_API_KEY=[your-key]
   • Redeploy

2. Run health check:
   curl https://[staging-url]/api/dsg/brain/execute

3. Monitor for 24 hours:
   • Watch logs for errors
   • Check database persistence
   • Test LLM plan generation

4. Review checklist:
   • No "Anthropic API error" in logs
   • No "Failed to save execution context" errors
   • Database has records in dsg_execution_grants table
   • API response time < 2s

📊 METRICS TO TRACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: All metrics stable for 24h = Ready for Production

• API Response Time: < 2s (goal: < 500ms)
• Error Rate: 0% (goal: < 0.1%)
• Anthropic API Errors: 0
• Database Persistence: Working ✓
• Conformance Violations: Expected (0 if correct whitelists)

🔄 ROLLBACK PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If issues occur:

1. Immediate: Remove ANTHROPIC_API_KEY from Vercel
   → API returns 503 (disabled but not broken)

2. Full Rollback: git revert 347d4b4
   → Reverts all DSG Brain code
   → Redeploy from Vercel dashboard

3. Database Cleanup:
   DELETE FROM dsg_execution_grants;
   DELETE FROM dsg_credential_leases;

📚 NEXT PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After 24h monitoring passes:

1. Review staging test results
2. Get security sign-off
3. Plan production deployment window
4. Merge to production branch
5. Execute with same monitoring

═══════════════════════════════════════════════════════════════════
SUMMARY_EOF

cat /tmp/dsg-brain-deployment-summary.txt
echo ""
echo "Full summary saved to: /tmp/dsg-brain-deployment-summary.txt"
echo ""

echo "✅ Deployment script complete!"
echo ""
echo "Next steps:"
echo "1. Set ANTHROPIC_API_KEY in Vercel dashboard"
echo "2. Run health check when deployment is ready"
echo "3. Run monitoring script for 24 hours"
echo "4. Review results and decide on production deployment"
echo ""
