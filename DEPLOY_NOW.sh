#!/bin/bash
###############################################################################
# DSG ONE END-TO-END DEPLOYMENT RUNNER
# Automates: Environment setup → Deployment → Revenue activation → Monitoring
# Usage: bash DEPLOY_NOW.sh [docker|aws|gcloud|railway|digitalocean|self-hosted]
###############################################################################

set -e

DEPLOYMENT_TYPE="${1:-docker}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%s)
LOG_FILE="$PROJECT_ROOT/deployment-$TIMESTAMP.log"

echo "🚀 DSG ONE DEPLOYMENT RUNNER - Starting at $(date)"
echo "📝 Logging to: $LOG_FILE"
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[LOG]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; exit 1; }
warning() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"; }
progress() { echo -e "${BLUE}→${NC} $1" | tee -a "$LOG_FILE"; }

# Phase 1: Environment Setup
phase_1_setup() {
  log "PHASE 1: Environment Setup"
  progress "Checking prerequisites..."

  # Check Node
  if ! command -v node &> /dev/null; then
    error "Node.js not installed. Install from https://nodejs.org/"
  fi
  success "Node $(node --version) found"

  # Check git
  if ! command -v git &> /dev/null; then
    error "Git not installed. Install from https://git-scm.com/"
  fi
  success "Git found"

  # Create .env.local if missing
  if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    progress "Creating .env.local from template..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.local"

    # Set local defaults
    sed -i 's|NEXT_PUBLIC_SUPABASE_URL=|NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321|g' "$PROJECT_ROOT/.env.local"
    sed -i 's|DSG_CORE_MODE=|DSG_CORE_MODE=internal|g' "$PROJECT_ROOT/.env.local"
    sed -i 's|ENABLE_DEMO_BOOTSTRAP=|ENABLE_DEMO_BOOTSTRAP=true|g' "$PROJECT_ROOT/.env.local"

    warning ".env.local created. Review and update with your credentials:"
    warning "  - STRIPE_SECRET_KEY"
    warning "  - ANTHROPIC_API_KEY"
    warning "  - Supabase credentials (if using remote)"
    echo ""
  else
    success ".env.local exists"
  fi

  # Install dependencies
  progress "Installing npm dependencies..."
  npm ci --silent >> "$LOG_FILE" 2>&1 || error "npm install failed"
  success "Dependencies installed"

  # TypeScript verification
  progress "Verifying TypeScript compilation..."
  npm run typecheck >> "$LOG_FILE" 2>&1 || error "TypeScript check failed"
  success "TypeScript verified"

  echo ""
}

# Phase 2: Deployment Strategy
phase_2_deploy() {
  log "PHASE 2: Deployment ($DEPLOYMENT_TYPE)"

  case "$DEPLOYMENT_TYPE" in
    docker)
      deploy_docker
      ;;
    aws)
      deploy_aws
      ;;
    gcloud)
      deploy_gcloud
      ;;
    railway)
      deploy_railway
      ;;
    digitalocean)
      deploy_digitalocean
      ;;
    self-hosted)
      deploy_self_hosted
      ;;
    *)
      error "Unknown deployment type: $DEPLOYMENT_TYPE"
      ;;
  esac

  echo ""
}

deploy_docker() {
  progress "Checking Docker..."
  if ! command -v docker &> /dev/null; then
    error "Docker not installed. Install from https://docker.com/ or use a different deployment option."
  fi
  success "Docker $(docker --version) found"

  progress "Starting Docker Compose..."
  cd "$PROJECT_ROOT"
  docker compose up -d >> "$LOG_FILE" 2>&1 || error "Docker Compose failed"
  success "Docker services started"

  progress "Waiting for services to be ready (30 seconds)..."
  sleep 10

  progress "Checking health endpoints..."
  local retries=0
  while [ $retries -lt 6 ]; do
    if curl -s http://localhost:3000/api/health &> /dev/null; then
      success "Health check passed: http://localhost:3000/api/health"
      echo ""
      echo "🎉 Application is LIVE at: http://localhost:3000"
      echo ""
      return 0
    fi
    retries=$((retries + 1))
    warning "Health check failed (attempt $retries/6), retrying..."
    sleep 5
  done

  warning "Health check did not complete, but services may still be starting."
  echo ""
  echo "Check service logs with:"
  echo "  docker compose logs -f app"
  echo ""
}

deploy_aws() {
  progress "AWS Deployment"
  warning "AWS deployment requires:"
  warning "  1. AWS CLI v2 installed and configured"
  warning "  2. AWS account with billing enabled"
  warning "  3. ~15 minutes setup time"
  echo ""
  echo "Run this to set up AWS infrastructure:"
  echo "  aws configure"
  echo "  bash $PROJECT_ROOT/scripts/deploy-aws-setup.sh"
  echo "  npm run deploy:aws"
  echo ""
}

deploy_gcloud() {
  progress "Google Cloud Deployment"
  warning "Google Cloud deployment requires:"
  warning "  1. gcloud CLI installed"
  warning "  2. Google Cloud project (free tier available)"
  warning "  3. ~5 minutes setup time"
  echo ""
  echo "Run this to deploy to Google Cloud:"
  echo "  gcloud auth login"
  echo "  gcloud config set project YOUR_PROJECT_ID"
  echo "  npm run deploy:gcloud"
  echo ""
}

deploy_railway() {
  progress "Railway Deployment"
  warning "Railway deployment is the fastest:"
  warning "  1. Free tier ($5/month credit, then pay-as-you-go)"
  warning "  2. GitHub integration (auto-deploys on push)"
  warning "  3. ~10 minutes setup, live in 5 minutes"
  echo ""
  echo "Run this to set up Railway:"
  echo "  bash DEPLOY_RAILWAY_AUTO.sh"
  echo ""
  echo "Or visit: https://railway.app/?referralCode=koQJVj"
  echo ""
}

deploy_digitalocean() {
  progress "DigitalOcean Deployment"
  warning "DigitalOcean deployment requires:"
  warning "  1. DigitalOcean account ($5-6/month)"
  warning "  2. doctl CLI tool installed"
  warning "  3. GitHub repository connected"
  echo ""
  echo "Visit to set up DigitalOcean App Platform:"
  echo "  https://cloud.digitalocean.com/apps/new"
  echo ""
}

deploy_self_hosted() {
  progress "Self-Hosted Deployment"
  warning "Self-hosted deployment requires:"
  warning "  1. Linux server with Docker/Kubernetes"
  warning "  2. PostgreSQL database"
  warning "  3. Redis cache"
  echo ""
  echo "Use docker-compose for quick setup:"
  echo "  docker compose up -d"
  echo ""
}

# Phase 3: Revenue Activation
phase_3_revenue() {
  log "PHASE 3: Revenue Activation"

  if [ ! -n "$STRIPE_SECRET_KEY" ] && ! grep -q "STRIPE_SECRET_KEY=sk_" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
    warning "Stripe not configured. Add STRIPE_SECRET_KEY to .env.local to activate billing."
    return 0
  fi

  progress "Activating revenue tracking..."

  if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
    progress "Running revenue dashboard..."
    npm run revenue:dashboard >> "$LOG_FILE" 2>&1 || warning "Revenue dashboard needs Stripe credentials"
  else
    warning "Revenue dashboard requires live Stripe credentials."
    warning "After deployment, run: npm run revenue:dashboard"
  fi

  echo ""
  echo "💰 Revenue Metrics Available:"
  echo "  • MRR (Monthly Recurring Revenue)"
  echo "  • ARR (Annual Recurring Revenue)"
  echo "  • Customer count"
  echo "  • 12-month forecast (customizable growth rate)"
  echo ""
  echo "Monitor in real-time:"
  echo "  npm run revenue:watch"
  echo ""
}

# Phase 4: Verification
phase_4_verify() {
  log "PHASE 4: Verification & Go-Live"

  echo "✅ Deployment Checklist:"
  echo "  [ ] Environment variables configured"
  echo "  [ ] Application deployed and running"
  echo "  [ ] Health check endpoint responding"
  echo "  [ ] Revenue tracking configured"
  echo "  [ ] Monitoring/logs accessible"
  echo ""

  case "$DEPLOYMENT_TYPE" in
    docker)
      echo "📊 Next Steps for Docker:"
      echo "  1. Access dashboard: http://localhost:3000"
      echo "  2. View logs: docker compose logs -f app"
      echo "  3. Stop services: docker compose down"
      echo ""
      ;;
    railway)
      echo "📊 Next Steps for Railway:"
      echo "  1. Follow DEPLOY_RAILWAY_AUTO.sh instructions"
      echo "  2. Connect GitHub repo to Railway"
      echo "  3. Add environment variables in Railway dashboard"
      echo "  4. Push to main → auto-deploy live"
      echo ""
      ;;
    aws|gcloud|digitalocean|self-hosted)
      echo "📊 Next Steps for $DEPLOYMENT_TYPE:"
      echo "  1. Configure custom domain (DNS)"
      echo "  2. Set up SSL/TLS certificate"
      echo "  3. Configure cloud-specific monitoring"
      echo "  4. Test public endpoints"
      echo ""
      ;;
  esac

  echo "📚 Documentation:"
  echo "  • EXECUTION_CHECKLIST.md - Detailed step-by-step guide"
  echo "  • MULTI_CLOUD_GUIDE.md - Platform-specific instructions"
  echo "  • DEPLOYMENT_STRATEGY.md - Architecture & roadmap"
  echo ""
}

# Main execution
main() {
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         🚀 DSG ONE END-TO-END DEPLOYMENT                      ║"
  echo "║         Platform: $DEPLOYMENT_TYPE                              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  phase_1_setup
  phase_2_deploy
  phase_3_revenue
  phase_4_verify

  success "Deployment initiated! Check $LOG_FILE for details."
  echo ""
  echo "🎉 Ready to ship! Monitor status and proceed to go-live."
}

# Run main
main
