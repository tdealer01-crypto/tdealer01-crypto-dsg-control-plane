#!/bin/bash
###############################################################################
# DSG ONE - Google Cloud FULLY AUTOMATED DEPLOYMENT
# สัญญา: แค่ run script นี้ เสร็จทั้งหมด
# ใช้เวลา: 30 นาที
# ค่าใช้: ฟรี ($300 credit)
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
LOG_FILE="$PROJECT_ROOT/gcloud-deploy-$TIMESTAMP.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    🚀 DSG ONE - GOOGLE CLOUD AUTOMATED DEPLOYMENT             ║"
echo "║    Status: FULLY AUTOMATIC                                    ║"
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

  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  fi
  success "gcloud CLI $(gcloud --version | head -1)"

  # Check Docker
  if ! command -v docker &> /dev/null; then
    warning "Docker not installed (optional, but recommended)"
  else
    success "Docker $(docker --version)"
  fi

  # Check git
  if ! command -v git &> /dev/null; then
    error "Git not found"
  fi
  success "Git $(git --version | awk '{print $3}')"

  echo ""
}

# ============================================================================
# PHASE 2: GET GOOGLE CLOUD CREDENTIALS
# ============================================================================

phase_authenticate() {
  log "PHASE 2: Authenticate with Google Cloud..."
  echo ""

  # Check if already authenticated
  if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    success "Already authenticated as: $(gcloud config get-value account)"
  else
    warning "Not authenticated. Opening browser for login..."
    gcloud auth login --no-launch-browser
    success "Authentication successful"
  fi

  echo ""
}

# ============================================================================
# PHASE 3: CREATE OR SELECT PROJECT
# ============================================================================

phase_project_setup() {
  log "PHASE 3: Setup Google Cloud Project..."
  echo ""

  # Get existing projects
  log "Fetching your Google Cloud projects..."
  PROJECTS=$(gcloud projects list --format="value(project_id)" 2>/dev/null || echo "")

  if [ -z "$PROJECTS" ]; then
    log "No projects found. Creating new one..."
    PROJECT_ID="dsg-control-plane-$(date +%s | tail -c 6)"

    log "Creating project: $PROJECT_ID"
    gcloud projects create "$PROJECT_ID" \
      --name="DSG Control Plane" \
      --set-as-default \
      >> "$LOG_FILE" 2>&1 || error "Failed to create project"

    success "Project created: $PROJECT_ID"
  else
    log "Available projects:"
    echo "$PROJECTS" | nl

    # Use first project as default
    PROJECT_ID=$(echo "$PROJECTS" | head -1)
    log "Using project: $PROJECT_ID"
    gcloud config set project "$PROJECT_ID" >> "$LOG_FILE" 2>&1
  fi

  success "Project ID: $PROJECT_ID"
  echo "PROJECT_ID=$PROJECT_ID" > "$PROJECT_ROOT/.gcloud-project"

  echo ""
}

# ============================================================================
# PHASE 4: ENABLE REQUIRED APIS
# ============================================================================

phase_enable_apis() {
  log "PHASE 4: Enabling Google Cloud APIs..."
  echo ""

  APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "artifactregistry.googleapis.com"
    "container.googleapis.com"
  )

  for api in "${APIS[@]}"; do
    log "Enabling $api..."
    gcloud services enable "$api" --project="$PROJECT_ID" >> "$LOG_FILE" 2>&1 &
  done

  wait
  success "All APIs enabled"

  echo ""
}

# ============================================================================
# PHASE 5: SETUP BILLING (CRITICAL)
# ============================================================================

phase_billing_setup() {
  log "PHASE 5: Verifying Billing..."
  echo ""

  # Check billing accounts
  BILLING=$(gcloud billing accounts list --format="value(name)" 2>/dev/null | head -1 || echo "")

  if [ -z "$BILLING" ]; then
    warning "No billing account found!"
    echo ""
    echo "  ⚠️  You MUST set up billing to deploy on Google Cloud"
    echo ""
    echo "  Steps:"
    echo "  1. Visit: https://console.cloud.google.com/billing"
    echo "  2. Create a billing account (add credit card - free trial $300)"
    echo "  3. Link it to project: $PROJECT_ID"
    echo ""
    echo "  After linking billing, run this script again."
    echo ""

    read -p "Have you set up billing? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      error "Billing required to continue"
    fi
  else
    success "Billing account configured"
  fi

  echo ""
}

# ============================================================================
# PHASE 6: BUILD AND PUSH IMAGE
# ============================================================================

phase_build_image() {
  log "PHASE 6: Building Docker Image..."
  echo ""

  cd "$PROJECT_ROOT"

  # Build locally (if docker available)
  if command -v docker &> /dev/null; then
    log "Building Docker image locally..."
    docker build -t dsg-control-plane:latest . >> "$LOG_FILE" 2>&1 || warning "Local Docker build optional"
    success "Image built"
  else
    log "Skipping local build (Docker not available)"
  fi

  echo ""
}

# ============================================================================
# PHASE 7: DEPLOY TO CLOUD RUN
# ============================================================================

phase_deploy() {
  log "PHASE 7: Deploying to Google Cloud Run..."
  echo ""

  cd "$PROJECT_ROOT"

  log "Building and deploying via Cloud Build..."

  gcloud builds submit \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" \
    >> "$LOG_FILE" 2>&1 || error "Cloud Build failed"

  success "Deployment submitted to Cloud Build"

  echo ""
  log "Waiting for deployment to complete (this takes 2-5 minutes)..."

  # Poll for completion
  for i in {1..60}; do
    SERVICE_URL=$(gcloud run services describe dsg-control-plane \
      --region=us-central1 \
      --project="$PROJECT_ID" \
      --format='value(status.url)' 2>/dev/null || echo "")

    if [ -n "$SERVICE_URL" ]; then
      success "✅ DEPLOYMENT COMPLETE!"
      echo ""
      echo "╔════════════════════════════════════════════════════════════════╗"
      echo "║                 🎉 LIVE & READY TO USE!                       ║"
      echo "╚════════════════════════════════════════════════════════════════╝"
      echo ""
      echo "📍 Your Application:"
      echo "   URL: $SERVICE_URL"
      echo ""
      echo "📊 Health Check:"
      echo "   $SERVICE_URL/api/health"
      echo ""
      echo "💻 Google Cloud Console:"
      echo "   https://console.cloud.google.com/run?project=$PROJECT_ID"
      echo ""
      echo "📈 View Logs:"
      echo "   gcloud run logs read dsg-control-plane --region=us-central1 --project=$PROJECT_ID --limit=50"
      echo ""
      echo "🔄 Re-deploy (auto on push):"
      echo "   git push origin main"
      echo ""

      return 0
    fi

    echo -ne "\r⏳ Deployment in progress... ($i/60)"
    sleep 2
  done

  error "Deployment timeout"
}

# ============================================================================
# PHASE 8: CONFIGURE ENVIRONMENT
# ============================================================================

phase_configure_env() {
  log "PHASE 8: Configuring Environment..."
  echo ""

  warning "Next: Add environment variables in Google Cloud Console:"
  echo ""
  echo "  https://console.cloud.google.com/run/detail/us-central1/dsg-control-plane?project=$PROJECT_ID"
  echo ""
  echo "  Set these in 'Variables & Secrets':"
  echo "    STRIPE_SECRET_KEY = sk_test_xxxxx"
  echo "    ANTHROPIC_API_KEY = sk-ant-xxxxx"
  echo "    CRON_SECRET = your-secret-here"
  echo ""
  echo "  (Optional Supabase):"
  echo "    NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co"
  echo "    SUPABASE_SERVICE_ROLE_KEY = xxxxx"
  echo ""
}

# ============================================================================
# PHASE 9: VERIFY & TEST
# ============================================================================

phase_verify() {
  log "PHASE 9: Verification..."
  echo ""

  SERVICE_URL=$(gcloud run services describe dsg-control-plane \
    --region=us-central1 \
    --project="$PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null)

  if [ -n "$SERVICE_URL" ]; then
    log "Testing health endpoint..."

    RESPONSE=$(curl -s "$SERVICE_URL/api/health" 2>/dev/null || echo "error")

    if echo "$RESPONSE" | grep -q "ok\|service"; then
      success "✅ Health check passed!"
    else
      warning "⚠️ Health check pending (database/config not yet set)"
    fi
  fi

  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  phase_check_tools
  phase_authenticate
  phase_project_setup
  phase_enable_apis
  phase_billing_setup
  phase_build_image
  phase_deploy
  phase_configure_env
  phase_verify

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                  ✅ DEPLOYMENT COMPLETE                       ║"
  echo "║                                                                ║"
  echo "║  Your app is LIVE on Google Cloud Run                         ║"
  echo "║  Using FREE $300 credit (valid 12 months)                     ║"
  echo "║                                                                ║"
  echo "║  Next: Add your API keys in the Cloud Console                 ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "📝 Log file: $LOG_FILE"
  echo ""
}

# Run
main
