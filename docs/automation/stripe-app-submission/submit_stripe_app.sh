#!/bin/bash

##############################################################################
# DSG Governance Gate - Stripe Marketplace Submission Orchestrator
#
# Usage: ./submit_stripe_app.sh [--skip-check] [--headless]
#
# This script coordinates the full submission workflow:
# 1. Environment setup check
# 2. Pre-submission verification
# 3. Browser automation
# 4. Results reporting
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration
SKIP_CHECK=false
HEADLESS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-check)
            SKIP_CHECK=true
            shift
            ;;
        --headless)
            HEADLESS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

##############################################################################
# Helper functions
##############################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

##############################################################################
# Main workflow
##############################################################################

print_header "🚀 DSG Governance Gate - Stripe Marketplace Submission"

# Check 1: Python availability
log_info "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 not found. Please install Python 3.8+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
log_success "Python $PYTHON_VERSION found"

# Check 2: Virtual environment
log_info "Checking virtual environment..."
if [ -d "venv" ]; then
    log_success "Virtual environment detected"
    source venv/bin/activate
else
    log_warning "Virtual environment not found"
    log_info "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    log_success "Virtual environment created"
fi

# Check 3: Dependencies
log_info "Checking dependencies..."
if ! python3 -c "import playwright" 2>/dev/null; then
    log_info "Installing Playwright..."
    pip install -q -r "$SCRIPT_DIR/requirements.txt"
    log_success "Playwright installed"
else
    log_success "Playwright already installed"
fi

# Check 4: Playwright browser
log_info "Checking Playwright browser..."
if ! [ -d "$HOME/.cache/ms-playwright/chromium"* ] 2>/dev/null; then
    log_info "Installing Chromium browser..."
    playwright install chromium
    log_success "Chromium installed"
else
    log_success "Chromium already installed"
fi

# Check 5: Asset files
log_info "Checking asset files..."
MISSING_ASSETS=false

if ! python3 "$SCRIPT_DIR/verify_submission_ready.py" > /dev/null 2>&1; then
    log_warning "Pre-submission checks found issues"
    if [ "$SKIP_CHECK" = false ]; then
        log_info "Running detailed pre-submission verification..."
        python3 "$SCRIPT_DIR/verify_submission_ready.py"

        read -p "Continue with submission despite warnings? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Submission cancelled"
            exit 1
        fi
    fi
else
    log_success "All pre-submission checks passed"
fi

# Get Stripe credentials
print_header "🔐 Stripe Dashboard Credentials"
log_info "Enter your Stripe Dashboard login credentials"
read -p "Email: " STRIPE_EMAIL
read -sp "Password: " STRIPE_PASSWORD
echo ""

if [ -z "$STRIPE_EMAIL" ] || [ -z "$STRIPE_PASSWORD" ]; then
    log_error "Email and password required"
    exit 1
fi

log_success "Credentials received"

# Run submission automation
print_header "🌐 Starting Browser Automation"

# Create Python script to run with credentials
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'EOF'
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from stripe_app_submission_agent import StripeAppSubmissionAgent

async def main():
    submission_data = os.getenv("SUBMISSION_DATA_JSON", "SUBMISSION_DATA.json")
    stripe_email = sys.argv[1]
    stripe_password = sys.argv[2]

    if not os.path.exists(submission_data):
        print(f"❌ SUBMISSION_DATA.json not found: {submission_data}")
        return

    agent = StripeAppSubmissionAgent(submission_data, stripe_email, stripe_password)
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
EOF

log_info "Launching submission automation..."
log_info "Browser window will open automatically"
log_info "Do not close browser until script completes"
echo ""

python3 "$TEMP_SCRIPT" "$STRIPE_EMAIL" "$STRIPE_PASSWORD"
SUBMISSION_EXIT_CODE=$?

rm "$TEMP_SCRIPT"

# Results
print_header "📊 Submission Results"

if [ $SUBMISSION_EXIT_CODE -eq 0 ]; then
    log_success "Submission automation completed"

    # Find the latest screenshot directory
    LATEST_SCREENSHOTS=$(ls -td submission_screenshots_*/ 2>/dev/null | head -1)

    if [ -n "$LATEST_SCREENSHOTS" ]; then
        log_success "Evidence saved to: $LATEST_SCREENSHOTS"
        log_info "Screenshots:"
        ls -1 "$LATEST_SCREENSHOTS"*.png | sed 's/^/  - /'

        log_success "Log file: $LATEST_SCREENSHOTS/submission_log.txt"
        echo ""
        echo "Recent log entries:"
        tail -10 "$LATEST_SCREENSHOTS/submission_log.txt" | sed 's/^/  /'
    fi
else
    log_error "Submission automation failed"
    exit 1
fi

# Post-submission guidance
print_header "📋 Next Steps"

echo "1. ✅ Review screenshots to confirm submission was successful"
echo "   cd $LATEST_SCREENSHOTS"
echo "   ls -la"
echo ""

echo "2. 📧 Check your email for Stripe confirmation"
echo "   - Look for confirmation message within 1 hour"
echo "   - Verify app appears in Dashboard Apps section"
echo ""

echo "3. ⏳ Wait for Stripe review"
echo "   - Typical review time: 1-7 days"
echo "   - May request clarifications (check email daily)"
echo ""

echo "4. 🔧 If Stripe requests changes:"
echo "   - Update SUBMISSION_DATA.json"
echo "   - Run verification: python3 verify_submission_ready.py"
echo "   - Re-run submission: ./submit_stripe_app.sh"
echo ""

log_success "Submission workflow complete!"
log_info "Archive the screenshot directory for audit trail"
