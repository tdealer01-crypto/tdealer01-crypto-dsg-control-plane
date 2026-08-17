#!/bin/bash
###############################################################################
# Railway Quick Start — Deploy DSG ONE to Production
# One-command setup for Railway deployment
# Usage: bash RAILWAY_QUICK_START.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
LOG_FILE="$PROJECT_ROOT/railway-quickstart-$TIMESTAMP.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🚀 DSG ONE — RAILWAY QUICK START                      ║"
echo "║         Deploy to production in 5 minutes                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logging to: $LOG_FILE"
echo ""

# ============================================================================
# Phase 1: Prerequisites Check
# ============================================================================

log "PHASE 1: Checking Prerequisites..."
echo ""

if ! command -v git &> /dev/null; then
  error "Git not found. Install from https://git-scm.com/"
fi
success "Git found"

if ! command -v node &> /dev/null; then
  error "Node.js not found. Install from https://nodejs.org/"
fi
success "Node $(node --version) found"

echo ""

# ============================================================================
# Phase 2: Git Status
# ============================================================================

log "PHASE 2: Repository Status..."
echo ""

if [ ! -d "$PROJECT_ROOT/.git" ]; then
  error "Not a git repository"
fi
success "Git repository found"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)
success "Current: $BRANCH ($COMMIT)"

if [ -n "$(git status --short)" ]; then
  warning "Uncommitted changes detected"
  warning "Commit before deploying:"
  warning "  git add ."
  warning "  git commit -m 'Ready for Railway deployment'"
  error "Please commit changes first"
fi

success "Working tree clean"
echo ""

# ============================================================================
# Phase 3: Configuration
# ============================================================================

log "PHASE 3: Railway Configuration..."
echo ""

if [ ! -f "$PROJECT_ROOT/.env.railway" ]; then
  warning ".env.railway not found"
  warning "You'll need to:"
  warning "  1. Get Railway token from: https://railway.app/account/tokens"
  warning "  2. Create .env.railway with: RAILWAY_TOKEN=your-token"
  echo ""
else
  success ".env.railway exists"
fi

if [ ! -f "$PROJECT_ROOT/railway.json" ]; then
  error "railway.json not found (should be in repo root)"
fi
success "railway.json configured"

if [ ! -f "$PROJECT_ROOT/Procfile" ]; then
  error "Procfile not found (should be in repo root)"
fi
success "Procfile configured"

echo ""

# ============================================================================
# Phase 4: Environment Variables Required
# ============================================================================

log "PHASE 4: Environment Variables..."
echo ""

echo "Add these to Railway Dashboard (Project → Settings → Variables):"
echo ""
echo "Required:"
echo "  • NEXT_PUBLIC_SUPABASE_URL"
echo "  • NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  • SUPABASE_SERVICE_ROLE_KEY"
echo "  • ANTHROPIC_API_KEY"
echo ""
echo "Optional:"
echo "  • STRIPE_SECRET_KEY (for billing)"
echo "  • CRON_SECRET (for scheduled jobs)"
echo ""

read -p "Have you configured all required variables in Railway Dashboard? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  warning "Please configure variables in Railway Dashboard first:"
  warning "  1. Go to https://railway.app/project/..."
  warning "  2. Click Settings → Variables"
  warning "  3. Add all required variables"
  warning "  4. Run this script again"
  exit 0
fi

echo ""

# ============================================================================
# Phase 5: Deploy
# ============================================================================

log "PHASE 5: Deployment..."
echo ""

progress() { echo -e "${BLUE}→${NC} $1"; }

progress "Verifying build..."
npm run typecheck >> "$LOG_FILE" 2>&1 || error "TypeScript check failed"
success "TypeScript verified"

progress "Building Next.js..."
npm run build >> "$LOG_FILE" 2>&1 || error "Next.js build failed"
success "Build successful"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ READY TO DEPLOY                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Deployment steps:"
echo ""
echo "1️⃣  Push to main (triggers auto-deploy):"
echo "   git push origin main"
echo ""
echo "2️⃣  Watch deployment in Railway:"
echo "   https://railway.app/project/..."
echo ""
echo "3️⃣  Test when deployment is Ready:"
echo "   curl https://<your-railway-url>/api/health"
echo ""
echo "4️⃣  Get live URL from Railway Dashboard:"
echo "   Deployments → [active] → Domain"
echo ""

read -p "Ready to push to main and deploy? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  progress "Pushing to main..."
  git push origin main >> "$LOG_FILE" 2>&1 || error "Git push failed"
  success "Pushed to main"

  echo ""
  success "🚀 Deployment triggered!"
  success "Railway will auto-build and deploy in 2-5 minutes"
  echo ""
  echo "Monitor progress:"
  echo "  https://railway.app/dashboard"
  echo ""
else
  success "Push manually when ready:"
  success "  git push origin main"
  echo ""
fi

echo "📝 Full log: $LOG_FILE"
echo ""
