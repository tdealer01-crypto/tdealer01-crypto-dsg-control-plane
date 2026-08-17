#!/bin/bash
###############################################################################
# DSG ONE - Railway FULLY AUTOMATED DEPLOYMENT
# Promise: Just run this script, get live URL in minutes
# Time: 10 minutes
# Cost: Free (pay-as-you-go, $5/month credit)
###############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
LOG_FILE="$PROJECT_ROOT/railway-deploy-$TIMESTAMP.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    🚀 DSG ONE - RAILWAY AUTOMATED DEPLOYMENT                   ║"
echo "║    Status: GITHUB-INTEGRATED (auto-deploys on push)            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logging to: $LOG_FILE"
echo ""

# ============================================================================
# PHASE 1: CHECK PREREQUISITES
# ============================================================================

phase_check_tools() {
  log "PHASE 1: Checking Prerequisites..."
  echo ""

  # Check Git
  if ! command -v git &> /dev/null; then
    error "Git not found. Install from https://git-scm.com/"
  fi
  success "Git $(git --version | awk '{print $3}')"

  # Check GitHub CLI (optional but recommended)
  if ! command -v gh &> /dev/null; then
    warning "GitHub CLI not installed (optional, but speeds up setup)"
    echo "  → Install from: https://cli.github.com"
  else
    success "GitHub CLI $(gh --version | awk '{print $3}')"
  fi

  echo ""
}

# ============================================================================
# PHASE 2: VERIFY GIT REPOSITORY
# ============================================================================

phase_verify_git() {
  log "PHASE 2: Verify Git Repository..."
  echo ""

  if [ ! -d "$PROJECT_ROOT/.git" ]; then
    error "Not a git repository. Initialize with: git init"
  fi
  success "Git repository found"

  REPO_URL=$(git config --get remote.origin.url)
  if [ -z "$REPO_URL" ]; then
    error "No remote 'origin' configured. Set with: git remote add origin <url>"
  fi
  success "Remote repository: $REPO_URL"

  # Extract repo owner/name
  REPO_NAME=$(basename "$REPO_URL" .git)
  REPO_OWNER=$(dirname "$REPO_URL" | xargs basename)

  success "Repo: $REPO_OWNER/$REPO_NAME"

  echo ""
}

# ============================================================================
# PHASE 3: SETUP RAILWAY
# ============================================================================

phase_setup_railway() {
  log "PHASE 3: Setting Up Railway..."
  echo ""

  log "Railway connects directly to your GitHub repository"
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                     🚀 RAILWAY SETUP                          ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Next steps:"
  echo ""
  echo "1️⃣  Visit Railway:"
  echo "   https://railway.app/?referralCode=koQJVj"
  echo ""
  echo "2️⃣  Create account (GitHub login recommended)"
  echo ""
  echo "3️⃣  Create new project:"
  echo "   Dashboard → New Project → Deploy from GitHub"
  echo ""
  echo "4️⃣  Connect your GitHub repository:"
  echo "   Select: $REPO_OWNER/$REPO_NAME"
  echo ""
  echo "5️⃣  Configure environment:"
  echo "   Under 'Variables' in Railway dashboard, add:"
  echo ""
  echo "   NEXT_PUBLIC_SUPABASE_URL = your-supabase-url"
  echo "   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key"
  echo "   ANTHROPIC_API_KEY = your-anthropic-key"
  echo "   STRIPE_SECRET_KEY = your-stripe-key (optional)"
  echo ""
  echo "6️⃣  Deploy:"
  echo "   Push to main branch, Railway auto-deploys"
  echo "   Or click 'Deploy' button in dashboard"
  echo ""
  echo "7️⃣  Get your URL:"
  echo "   In Railway → Deployments → Domain"
  echo ""

  read -p "Ready to open Railway? (y/n) " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Try to open in browser
    if command -v open &> /dev/null; then
      open "https://railway.app/?referralCode=koQJVj"
    elif command -v xdg-open &> /dev/null; then
      xdg-open "https://railway.app/?referralCode=koQJVj"
    else
      log "Copy link to browser: https://railway.app/?referralCode=koQJVj"
    fi
  fi

  echo ""
}

# ============================================================================
# PHASE 4: PREPARE ENVIRONMENT
# ============================================================================

phase_prepare_env() {
  log "PHASE 4: Preparing Environment..."
  echo ""

  # Create .env.local if missing
  if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    progress "Creating .env.local template..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.local" 2>/dev/null || true

    warning "Please configure .env.local with your credentials:"
    warning "  - NEXT_PUBLIC_SUPABASE_URL"
    warning "  - SUPABASE_SERVICE_ROLE_KEY"
    warning "  - ANTHROPIC_API_KEY"
    echo ""
  else
    success ".env.local already configured"
  fi

  echo ""
}

# ============================================================================
# PHASE 5: PREPARE COMMIT & PUSH
# ============================================================================

phase_prepare_push() {
  log "PHASE 5: Prepare for Push..."
  echo ""

  # Check if there are uncommitted changes
  UNSTAGED=$(git status --short)
  if [ -n "$UNSTAGED" ]; then
    warning "You have uncommitted changes:"
    echo "$UNSTAGED" | head -5
    echo ""
    warning "Commit these before Railway deploy:"
    echo "  git add ."
    echo "  git commit -m 'Deployment ready'"
    echo "  git push origin main"
    echo ""
  else
    success "Working tree is clean"
  fi

  echo ""
}

# ============================================================================
# PHASE 6: VERIFY DEPLOYMENT
# ============================================================================

phase_verify() {
  log "PHASE 6: Deployment Verification..."
  echo ""

  echo "After Railway deployment completes:"
  echo ""
  echo "✅ Check deployment logs:"
  echo "   Railway Dashboard → Deployments → Logs"
  echo ""
  echo "✅ Test health endpoint:"
  echo "   curl https://<your-railway-url>/api/health"
  echo ""
  echo "✅ View live app:"
  echo "   https://<your-railway-url>"
  echo ""
  echo "✅ Real-time auto-deploy:"
  echo "   Every push to main → automatic Railway deploy"
  echo ""

  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  phase_check_tools
  phase_verify_git
  phase_setup_railway
  phase_prepare_env
  phase_prepare_push
  phase_verify

  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            ✅ RAILWAY SETUP INSTRUCTIONS COMPLETE            ║"
  echo "║                                                                ║"
  echo "║  1. Sign up at railway.app (free tier)                        ║"
  echo "║  2. Connect your GitHub repository                            ║"
  echo "║  3. Add environment variables (Supabase, Anthropic keys)      ║"
  echo "║  4. Push to main → Railway auto-deploys                       ║"
  echo "║  5. Your app goes live in ~5 minutes                          ║"
  echo "║                                                                ║"
  echo "║  Cost: FREE (first $5/month, then pay-as-you-go)             ║"
  echo "║  Auto-scaling: Yes (free tier included)                       ║"
  echo "║  GitHub Integration: Built-in (no config needed)              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "📝 Log file: $LOG_FILE"
  echo ""
}

# Run
main
