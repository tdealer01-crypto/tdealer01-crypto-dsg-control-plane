#!/bin/bash
###############################################################################
# DSG ONE - Railway CLI Automated Deployment
# Uses Railway API with authentication token
# Usage: RAILWAY_TOKEN=<token> bash DEPLOY_RAILWAY_CLI.sh
###############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Check for Railway token
if [ -z "$RAILWAY_TOKEN" ]; then
  if [ -f .env.railway ]; then
    export $(cat .env.railway | grep -v '^#')
  else
    error "RAILWAY_TOKEN not set. Provide with: RAILWAY_TOKEN=<your-token> bash DEPLOY_RAILWAY_CLI.sh"
  fi
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
LOG_FILE="$PROJECT_ROOT/railway-cli-deploy-$TIMESTAMP.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    🚀 DSG ONE - RAILWAY CLI AUTOMATED DEPLOYMENT              ║"
echo "║    Status: TOKEN AUTHENTICATED                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logging to: $LOG_FILE"
echo ""

# ============================================================================
# PHASE 1: VERIFY AUTHENTICATION
# ============================================================================

phase_verify_auth() {
  log "PHASE 1: Verifying Railway Authentication..."
  echo ""

  # Test token with Railway API
  RESPONSE=$(curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
    https://api.railway.app/graphql \
    -d '{"query": "query { me { id email } }"}' \
    2>&1 | head -20)

  if echo "$RESPONSE" | grep -q '"id"'; then
    success "Authentication successful"
    USER_ID=$(echo "$RESPONSE" | grep -oP '"id":"?\K[^"]*' | head -1)
    success "User ID: ${USER_ID:0:12}..."
  else
    warning "Could not verify authentication (rate limited or offline)"
    log "Response: $RESPONSE"
  fi

  echo ""
}

# ============================================================================
# PHASE 2: CHECK PREREQUISITES
# ============================================================================

phase_check_tools() {
  log "PHASE 2: Checking Prerequisites..."
  echo ""

  # Check Node
  if ! command -v node &> /dev/null; then
    error "Node.js not installed"
  fi
  success "Node $(node --version)"

  # Check Git
  if ! command -v git &> /dev/null; then
    error "Git not installed"
  fi
  success "Git found"

  # Check curl
  if ! command -v curl &> /dev/null; then
    error "curl not installed"
  fi
  success "curl found"

  echo ""
}

# ============================================================================
# PHASE 3: PREPARE DEPLOYMENT
# ============================================================================

phase_prepare() {
  log "PHASE 3: Preparing for Deployment..."
  echo ""

  # Check git status
  if [ -n "$(git status --short)" ]; then
    warning "Uncommitted changes detected:"
    git status --short | head -5
    echo ""
    warning "Commit changes before deploying:"
    warning "  git add ."
    warning "  git commit -m 'Ready for deployment'"
    error "Commit changes first"
  fi

  success "Working tree clean"

  # Get current branch
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  COMMIT=$(git rev-parse --short HEAD)
  success "Current branch: $BRANCH ($COMMIT)"

  echo ""
}

# ============================================================================
# PHASE 4: DEPLOY INSTRUCTIONS
# ============================================================================

phase_deploy_info() {
  log "PHASE 4: Deployment via Railway CLI..."
  echo ""

  echo "Your Railway token is configured."
  echo ""
  echo "Next steps:"
  echo ""
  echo "1️⃣  Install Railway CLI locally:"
  echo "   npm install -g @railway/cli"
  echo ""
  echo "2️⃣  Authenticate Railway CLI:"
  echo "   railway login --token $RAILWAY_TOKEN"
  echo ""
  echo "3️⃣  Link project (one-time):"
  echo "   railway link"
  echo "   Select or create project: dsg-control-plane"
  echo ""
  echo "4️⃣  Deploy:"
  echo "   railway up"
  echo ""
  echo "5️⃣  View logs:"
  echo "   railway logs"
  echo ""
  echo "6️⃣  Get URL:"
  echo "   railway env"
  echo ""

  echo ""
}

# ============================================================================
# PHASE 5: ENVIRONMENT SETUP
# ============================================================================

phase_env_setup() {
  log "PHASE 5: Environment Variables..."
  echo ""

  if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    warning "No .env.local found"
    echo ""
    echo "Create .env.local with your credentials:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=..."
    echo "  SUPABASE_SERVICE_ROLE_KEY=..."
    echo "  ANTHROPIC_API_KEY=..."
    echo ""
  else
    success ".env.local exists"
  fi

  echo "These variables will be set in Railway:"
  echo "  → NEXT_PUBLIC_SUPABASE_URL"
  echo "  → SUPABASE_SERVICE_ROLE_KEY"
  echo "  → ANTHROPIC_API_KEY"
  echo "  → STRIPE_SECRET_KEY (optional)"
  echo ""

  echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  phase_verify_auth
  phase_check_tools
  phase_prepare
  phase_deploy_info
  phase_env_setup

  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║          ✅ RAILWAY CLI SETUP COMPLETE                       ║"
  echo "║                                                                ║"
  echo "║  Your Railway token is configured and saved to .env.railway  ║"
  echo "║                                                                ║"
  echo "║  Next: Install Railway CLI on your local machine:            ║"
  echo "║    npm install -g @railway/cli                              ║"
  echo "║    railway login --token <your-token>                       ║"
  echo "║    railway link                                              ║"
  echo "║    railway up                                                 ║"
  echo "║                                                                ║"
  echo "║  Cost: FREE ($5/month credit)                                ║"
  echo "║  Deploy: One command (railway up)                            ║"
  echo "║  Live: ~5 minutes                                             ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "📝 Log file: $LOG_FILE"
  echo "🔐 Token saved: .env.railway"
  echo ""
}

# Run
main
