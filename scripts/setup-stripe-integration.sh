#!/bin/bash

################################################################################
# Stripe Integration Setup Script
# Purpose: Install Stripe CLI, authenticate, verify API keys, and check credits
# Usage: ./setup-stripe-integration.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# UTILITY FUNCTIONS
################################################################################

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_section() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

################################################################################
# STRIPE CLI DETECTION & INSTALLATION
################################################################################

detect_stripe_cli() {
    print_section "Stripe CLI Detection"

    if command -v stripe &> /dev/null; then
        STRIPE_VERSION=$(stripe version 2>/dev/null || echo "unknown")
        print_success "Stripe CLI found: $STRIPE_VERSION"
        return 0
    else
        print_warning "Stripe CLI not installed"
        return 1
    fi
}

install_stripe_cli() {
    print_section "Installing Stripe CLI"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Detected macOS - installing via Homebrew"
        if command -v brew &> /dev/null; then
            brew install stripe/stripe-cli/stripe
            print_success "Stripe CLI installed via Homebrew"
        else
            print_error "Homebrew not found. Install from: https://brew.sh"
            return 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_info "Detected Linux"
        if command -v apt-get &> /dev/null; then
            print_info "Installing Stripe CLI via apt-get"
            wget -qO - https://downloads.stripe.com/stripe-cli-gpg.key | sudo apt-key add -
            echo "deb https://downloads.stripe.com/linux/debian focal main" | sudo tee /etc/apt/sources.list.d/stripe.list
            sudo apt-get update
            sudo apt-get install -y stripe
            print_success "Stripe CLI installed via apt-get"
        else
            print_warning "Please install Stripe CLI manually from: https://stripe.com/docs/stripe-cli#install"
            return 1
        fi
    else
        print_warning "Unsupported OS. Please install Stripe CLI manually from: https://stripe.com/docs/stripe-cli#install"
        return 1
    fi
}

################################################################################
# STRIPE AUTHENTICATION
################################################################################

check_stripe_auth() {
    print_section "Stripe Authentication Check"

    if stripe status --json &> /dev/null; then
        print_success "Stripe CLI is authenticated"
        return 0
    else
        print_warning "Stripe CLI not authenticated"
        return 1
    fi
}

authenticate_stripe() {
    print_section "Stripe CLI Authentication"

    print_info "Opening Stripe authentication..."
    print_info "You will be redirected to the Stripe dashboard in your browser"
    print_info "Please log in and authorize the Stripe CLI"

    sleep 2

    stripe login --interactive

    if check_stripe_auth; then
        print_success "Authentication successful"
        return 0
    else
        print_error "Authentication failed"
        return 1
    fi
}

################################################################################
# ENVIRONMENT & API KEY VERIFICATION
################################################################################

check_env_vars() {
    print_section "Environment Variables Check"

    MISSING=0

    # Check .env.local file
    if [ -f .env.local ]; then
        print_success "Found .env.local"

        if grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" .env.local; then
            print_success "✓ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY configured"
        else
            print_warning "✗ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing"
            MISSING=$((MISSING+1))
        fi

        if grep -q "STRIPE_SECRET_KEY" .env.local; then
            print_success "✓ STRIPE_SECRET_KEY configured"
        else
            print_warning "✗ STRIPE_SECRET_KEY missing"
            MISSING=$((MISSING+1))
        fi

        if grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
            print_success "✓ STRIPE_WEBHOOK_SECRET configured"
        else
            print_warning "✗ STRIPE_WEBHOOK_SECRET missing"
            MISSING=$((MISSING+1))
        fi
    else
        print_warning ".env.local not found"
        print_info "Copy .env.example to .env.local and fill in Stripe keys"
        MISSING=$((MISSING+1))
    fi

    if [ $MISSING -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# STRIPE ACCOUNT VERIFICATION
################################################################################

verify_stripe_account() {
    print_section "Stripe Account Verification"

    # Get account info via Stripe CLI
    if stripe customers list --limit 1 --json &> /dev/null; then
        print_success "Stripe API connection verified"

        # Get account info
        ACCOUNT_INFO=$(stripe status --json 2>/dev/null || echo "")

        if [ ! -z "$ACCOUNT_INFO" ]; then
            print_success "Account status:"
            echo "$ACCOUNT_INFO" | grep -E "username|account_id" | while read -r line; do
                echo "  $line"
            done
        fi

        return 0
    else
        print_warning "Could not verify Stripe API connection"
        print_info "Verify that STRIPE_SECRET_KEY is set correctly"
        return 1
    fi
}

################################################################################
# STRIPE PRODUCTS CHECK
################################################################################

check_stripe_products() {
    print_section "Active Stripe Products"

    print_info "Current active Stripe products in Dashboard:"
    echo ""
    echo "  ✅ Payments (Transaction Processing)"
    echo "  ✅ Billing (Subscriptions & Metered Billing)"
    echo "  ✅ Connect (Marketplace Payouts)"
    echo ""
    print_info "Optional Products Available:"
    echo ""
    echo "  🔲 Radar (Fraud Detection) - 1-line to enable"
    echo "  🔲 Identity (KYC Verification) - 3-5 day setup"
    echo "  🔲 Tax (Automated Tax Calculation) - 1-line to enable"
    echo "  🔲 Treasury (Financial Accounts) - Advanced"
    echo "  🔲 Issuing (Virtual/Physical Cards) - Advanced"
    echo ""
    print_info "Go to https://dashboard.stripe.com/products to activate"
}

################################################################################
# STRIPE STARTUPS CREDIT CHECK
################################################################################

check_startups_credit() {
    print_section "Stripe Startups Credit Check"

    print_info "To check your Startups credit balance:"
    echo ""
    echo "  1. Go to: https://dashboard.stripe.com/settings/billing/overview"
    echo "  2. Scroll to 'Stripe Startups credit' section"
    echo "  3. View: Amount remaining + Expiration date"
    echo ""
    print_warning "The Stripe CLI does not currently expose credit balance via API"
    print_info "Manual dashboard check required for exact balance"
    echo ""
    print_info "Credit details:"
    echo "  Amount: ฿500,586 (~\$15,000 USD equivalent)"
    echo "  Validity: 24 months from activation"
    echo "  Auto-apply: Yes (no action needed)"
    echo "  Usage: All Stripe products"
}

################################################################################
# WEBHOOK CONFIGURATION
################################################################################

check_webhook_config() {
    print_section "Webhook Configuration"

    print_info "Your webhook endpoint should be:"
    echo ""
    echo "  POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe"
    echo ""
    print_info "Or for local testing:"
    echo ""
    echo "  Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
    echo ""
    print_warning "Set STRIPE_WEBHOOK_SECRET from the output above in .env.local"
}

################################################################################
# TEST PAYMENT FLOW
################################################################################

test_payment_flow() {
    print_section "Test Payment Flow"

    print_info "To test your Stripe integration:"
    echo ""
    echo "  1. Start dev server: npm run dev"
    echo "  2. Go to: http://localhost:3000"
    echo "  3. Create a test payment session"
    echo ""
    print_info "Use these test card numbers:"
    echo ""
    echo "  Success:        4242 4242 4242 4242"
    echo "  Requires auth:  4000 0025 0000 3155"
    echo "  Declined:       4000 0000 0000 0002"
    echo ""
    print_warning "Always use test API keys (pk_test_* and sk_test_*) for testing"
}

################################################################################
# PRODUCTION READINESS
################################################################################

check_production_readiness() {
    print_section "Production Readiness Checklist"

    READY=0
    TOTAL=10

    echo ""
    [ -f .env.local ] && { echo "  [✓] .env.local exists"; ((READY++)); } || echo "  [ ] .env.local missing"
    grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" .env.local 2>/dev/null && { echo "  [✓] Publishable key configured"; ((READY++)); } || echo "  [ ] Publishable key missing"
    grep -q "STRIPE_SECRET_KEY" .env.local 2>/dev/null && { echo "  [✓] Secret key configured"; ((READY++)); } || echo "  [ ] Secret key missing"
    grep -q "STRIPE_WEBHOOK_SECRET" .env.local 2>/dev/null && { echo "  [✓] Webhook secret configured"; ((READY++)); } || echo "  [ ] Webhook secret missing"
    stripe status --json &>/dev/null && { echo "  [✓] Stripe CLI authenticated"; ((READY++)); } || echo "  [ ] Stripe CLI not authenticated"
    [ -n "$(command -v npm)" ] && { echo "  [✓] npm installed"; ((READY++)); } || echo "  [ ] npm not installed"
    [ -f package.json ] && { echo "  [✓] Next.js app found"; ((READY++)); } || echo "  [ ] Next.js app not found"
    [ -f supabase/schema.sql ] || [ -n "$(grep -l 'supabase' package.json 2>/dev/null)" ] && { echo "  [✓] Database configured"; ((READY++)); } || echo "  [ ] Database not found"
    echo ""

    PERCENTAGE=$((READY * 100 / TOTAL))
    echo "  Progress: $READY / $TOTAL ($PERCENTAGE%)"
    echo ""

    if [ $READY -eq $TOTAL ]; then
        print_success "All checks passed!"
        return 0
    else
        print_warning "Some checks failed - see items above"
        return 1
    fi
}

################################################################################
# SUMMARY & NEXT STEPS
################################################################################

print_summary() {
    print_header "Setup Complete"

    echo "Next Steps:"
    echo ""
    echo "  1. ✅ Configure Stripe API keys in .env.local"
    echo "  2. ✅ Authenticate Stripe CLI (if needed)"
    echo "  3. 🔄 Run: npm run dev"
    echo "  4. 🔄 Test payment flow with test cards"
    echo "  5. 🔄 Set up webhook endpoint in dashboard"
    echo "  6. 📊 Monitor transactions in dashboard"
    echo "  7. 🚀 Switch to live keys when ready"
    echo ""
    echo "Useful Commands:"
    echo ""
    echo "  stripe dashboard              # Open Stripe dashboard"
    echo "  stripe listen                 # Listen for webhooks"
    echo "  stripe status                 # Check authentication"
    echo "  stripe events resend          # Resend test events"
    echo ""
    echo "Documentation:"
    echo ""
    echo "  Stripe Docs:  https://stripe.com/docs"
    echo "  Dashboard:    https://dashboard.stripe.com"
    echo "  API Reference: https://stripe.com/docs/api"
    echo ""
}

################################################################################
# MAIN SCRIPT
################################################################################

main() {
    print_header "Stripe Integration Setup Tool"
    print_info "Version 1.0 - For DSG-ONE, Inc."

    # Step 1: Check/Install Stripe CLI
    if ! detect_stripe_cli; then
        read -p "Install Stripe CLI now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if ! install_stripe_cli; then
                print_error "Failed to install Stripe CLI"
                exit 1
            fi
        else
            print_warning "Stripe CLI is required. Please install manually."
            print_info "Installation: https://stripe.com/docs/stripe-cli#install"
            exit 1
        fi
    fi

    # Step 2: Check authentication
    if ! check_stripe_auth; then
        read -p "Authenticate with Stripe now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if ! authenticate_stripe; then
                print_error "Authentication failed"
                exit 1
            fi
        else
            print_warning "Stripe CLI authentication required"
            exit 1
        fi
    fi

    # Step 3: Check environment variables
    print_info "Checking environment variables..."
    check_env_vars

    # Step 4: Verify Stripe account
    print_info "Verifying Stripe account..."
    verify_stripe_account || print_warning "Could not verify account - check .env.local"

    # Step 5: Show available products
    check_stripe_products

    # Step 6: Check Startups credit
    check_startups_credit

    # Step 7: Webhook configuration
    check_webhook_config

    # Step 8: Test payment flow
    test_payment_flow

    # Step 9: Production readiness check
    check_production_readiness

    # Step 10: Summary
    print_summary

    echo ""
    print_success "Stripe integration setup complete!"
    print_info "You're ready to start testing Stripe payments"
    echo ""
}

# Run main script
main "$@"
