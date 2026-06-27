#!/bin/bash
################################################################################
# Environment Variables to Vercel Migration Helper
# Guides users through copying environment variables from .env.local to Vercel
# Usage: ./scripts/env-to-vercel.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

ENV_FILE=".env.local"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
    echo -e "\n${BLUE}▶ $1${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_code() {
    echo -e "${MAGENTA}$1${NC}"
}

# Check if .env.local exists
check_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "$ENV_FILE not found!"
        echo ""
        echo -e "Please run ${CYAN}./scripts/env-setup-wizard.sh${NC} first to create your configuration."
        exit 1
    fi
    print_success "Found $ENV_FILE"
}

# Parse and organize environment variables
parse_env_vars() {
    declare -gA STRIPE_VARS
    declare -gA SUPABASE_VARS
    declare -gA APP_VARS
    declare -gA OTHER_VARS

    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        case "$key" in
            STRIPE_*|stripe_*)
                STRIPE_VARS["$key"]="$value"
                ;;
            *SUPABASE*|SUPABASE_*)
                SUPABASE_VARS["$key"]="$value"
                ;;
            APP_URL|NEXT_PUBLIC_APP_URL)
                APP_VARS["$key"]="$value"
                ;;
            *)
                OTHER_VARS["$key"]="$value"
                ;;
        esac
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
}

# Display formatted environment variables for copy-paste
display_formatted_vars() {
    print_header "Environment Variables Ready for Vercel"

    print_section "Step 1: Copy & Paste Variables"
    echo "Below are all non-empty variables from $ENV_FILE, organized by category."
    echo -e "Copy each variable's ${CYAN}KEY=VALUE${NC} pair to your Vercel Dashboard."
    echo ""

    # Stripe variables
    if [[ ${#STRIPE_VARS[@]} -gt 0 ]]; then
        print_info "Stripe Configuration (Copy these in Vercel Dashboard → Settings → Environment Variables)"
        for var in "${!STRIPE_VARS[@]}"; do
            if [[ -n "${STRIPE_VARS[$var]}" ]]; then
                print_code "${var}=${STRIPE_VARS[$var]}"
            fi
        done
        echo ""
    fi

    # Supabase variables
    if [[ ${#SUPABASE_VARS[@]} -gt 0 ]]; then
        print_info "Supabase Configuration"
        for var in "${!SUPABASE_VARS[@]}"; do
            if [[ -n "${SUPABASE_VARS[$var]}" ]]; then
                print_code "${var}=${SUPABASE_VARS[$var]}"
            fi
        done
        echo ""
    fi

    # Application URLs
    if [[ ${#APP_VARS[@]} -gt 0 ]]; then
        print_info "Application URLs"
        for var in "${!APP_VARS[@]}"; do
            if [[ -n "${APP_VARS[$var]}" ]]; then
                print_code "${var}=${APP_VARS[$var]}"
            fi
        done
        echo ""
    fi

    # Other variables
    if [[ ${#OTHER_VARS[@]} -gt 0 ]]; then
        print_info "Other Configuration"
        for var in "${!OTHER_VARS[@]}"; do
            if [[ -n "${OTHER_VARS[$var]}" ]]; then
                print_code "${var}=${OTHER_VARS[$var]}"
            fi
        done
        echo ""
    fi
}

# Show Vercel CLI instructions
show_vercel_cli_instructions() {
    print_section "Step 2: Automated Setup with Vercel CLI (Optional)"

    echo "If you have the ${CYAN}vercel${NC} CLI installed, you can automatically set environment variables:"
    echo ""

    if command -v vercel &> /dev/null; then
        print_success "Vercel CLI detected!"
        echo ""
        echo "You can use these commands to set variables:"
        echo ""

        # Read and display vercel commands
        while IFS='=' read -r key value; do
            [[ "$key" =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            [[ -z "$value" ]] && continue

            # Escape single quotes in value
            escaped_value="${value//\'/\'\\\'\'}"
            print_code "vercel env add ${key} '${escaped_value}'"
        done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | grep -v '=$')

        echo ""
        print_info "Or use this script to set all variables at once:"
        echo ""
        print_code "cat .env.local | grep -v '^#' | grep -v '^\$' | while IFS='=' read -r k v; do vercel env add \"\$k\" \"\$v\"; done"
        echo ""
    else
        print_warning "Vercel CLI not installed"
        echo ""
        echo "Install it with: ${CYAN}npm install -g vercel${NC}"
        echo "Then run: ${CYAN}vercel link${NC}"
        echo ""
    fi
}

# Show dashboard instructions
show_dashboard_instructions() {
    print_section "Step 3: Manual Setup via Vercel Dashboard"

    echo -e "${YELLOW}If you prefer manual setup:${NC}\n"
    echo "1. Go to https://vercel.com/dashboard"
    echo "2. Select your project (tdealer01-crypto-dsg-control-plane)"
    echo "3. Click 'Settings' → 'Environment Variables'"
    echo "4. For each variable below, click 'Add':"
    echo ""
    echo "   • Set 'Name' to the variable name (e.g., STRIPE_SECRET_KEY)"
    echo "   • Set 'Value' to the value from $ENV_FILE"
    echo "   • Check environments where it should be available:"
    echo "     - Production (for live deployments)"
    echo "     - Preview (for PR previews)"
    echo "     - Development (for local use with 'vercel env pull')"
    echo "   • Click 'Save'"
    echo ""
    echo "5. After adding all variables, redeploy:"
    echo "   • Go to 'Deployments' tab"
    echo "   • Find the latest deployment"
    echo "   • Click 'Redeploy' to apply new environment variables"
    echo ""
}

# Show security warnings
show_security_warnings() {
    print_header "Security Warnings & Best Practices"

    print_warning "NEVER commit .env.local to version control"
    echo "  Add to .gitignore if not already present:"
    print_code "  echo '.env.local' >> .gitignore"
    echo ""

    print_warning "NEVER share .env.local files over insecure channels"
    echo "  • Use secure password managers (1Password, Bitwarden, LastPass)"
    echo "  • Use Vercel's native environment variable encryption"
    echo "  • For team access, use Vercel's dashboard (Vercel Team Pro+)"
    echo ""

    print_warning "NEVER print sensitive values in logs"
    echo "  • CI/CD systems should mask environment variable values"
    echo "  • Check GitHub Actions secrets are properly configured"
    echo ""

    print_warning "Review the Security Guide for complete best practices:"
    print_code "  cat docs/ENV_VARS_SECURITY_GUIDE.md"
    echo ""
}

# Show environment variable visibility
show_var_visibility() {
    print_section "Step 4: Environment Variable Visibility"

    echo "When setting environment variables in Vercel, consider scope:\n"

    echo -e "${BLUE}Server-side only (keep SECRET):${NC}"
    echo "  • STRIPE_SECRET_KEY (NEVER expose to browser)"
    echo "  • STRIPE_WEBHOOK_SECRET (NEVER expose to browser)"
    echo "  • SUPABASE_SERVICE_ROLE_KEY (NEVER expose to browser)"
    echo "  • UPSTASH_REDIS_REST_TOKEN (NEVER expose to browser)"
    echo ""

    echo -e "${BLUE}Safe for client (can be PUBLIC):${NC}"
    echo "  • NEXT_PUBLIC_SUPABASE_URL"
    echo "  • NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  • NEXT_PUBLIC_APP_URL"
    echo ""

    echo -e "${YELLOW}Caution - Org/System Scope:${NC}"
    echo "  • DSG_ALLOWED_ORIGINS (verify CORS allowlist before deployment)"
    echo ""
}

# Show recovery procedures
show_recovery_procedures() {
    print_section "If You Need to Rotate Keys"

    echo "Key rotation is critical for security. See docs/ENV_VARS_SECURITY_GUIDE.md for:"
    echo ""
    echo "  • ${CYAN}Rotating Stripe API Keys${NC}"
    echo "    - Archive old keys in Stripe Dashboard"
    echo "    - Generate new keys"
    echo "    - Update Vercel environment variables"
    echo "    - Update .env.local (local development)"
    echo "    - Redeploy to Vercel"
    echo ""
    echo "  • ${CYAN}Rotating Supabase Keys${NC}"
    echo "    - Supabase Project Settings → API"
    echo "    - Generate new anon/service role keys"
    echo "    - Update Vercel environment variables"
    echo "    - Update .env.local"
    echo "    - Redeploy to Vercel"
    echo ""
    echo "  • ${CYAN}Rotating Redis/Upstash Credentials${NC}"
    echo "    - Upstash Console → Database → Settings"
    echo "    - Update REST API credentials if compromised"
    echo "    - Update Vercel and local config"
    echo ""
}

# Show verification steps
show_verification_steps() {
    print_section "Step 5: Verify Deployment"

    echo "After deploying with new environment variables:\n"

    echo "1. ${CYAN}Check deployment status:${NC}"
    print_code "   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"
    echo ""

    echo "2. ${CYAN}Verify environment is correct:${NC}"
    print_code "   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status"
    echo ""

    echo "3. ${CYAN}Test Stripe integration (if configured):${NC}"
    print_code "   npm run test:integration -- --grep Stripe"
    echo ""

    echo "4. ${CYAN}Test Supabase connection:${NC}"
    print_code "   npm run test:integration -- --grep Supabase"
    echo ""

    print_warning "If tests fail, check:"
    echo "  • All required variables are set in Vercel"
    echo "  • Deployment has been redeployed after setting variables"
    echo "  • Wait 30 seconds for environment variable propagation"
    echo "  • Check Vercel Function logs: https://vercel.com/dashboard"
    echo ""
}

# Main interactive menu
show_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}  Vercel Migration Menu${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "  1) Show variables formatted for copy-paste"
        echo "  2) Show Vercel CLI instructions"
        echo "  3) Show Vercel Dashboard instructions"
        echo "  4) Show environment variable visibility guide"
        echo "  5) Show security warnings"
        echo "  6) Show key rotation procedures"
        echo "  7) Show deployment verification steps"
        echo "  8) Show all information"
        echo "  9) Exit"
        echo ""
        read -p "Select option [1-9]: " menu_choice

        case $menu_choice in
            1)
                display_formatted_vars
                ;;
            2)
                show_vercel_cli_instructions
                ;;
            3)
                show_dashboard_instructions
                ;;
            4)
                show_var_visibility
                ;;
            5)
                show_security_warnings
                ;;
            6)
                show_recovery_procedures
                ;;
            7)
                show_verification_steps
                ;;
            8)
                display_formatted_vars
                show_vercel_cli_instructions
                show_dashboard_instructions
                show_var_visibility
                show_security_warnings
                show_recovery_procedures
                show_verification_steps
                ;;
            9)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

################################################################################
# Main Script
################################################################################

main() {
    clear

    # Print welcome banner
    echo -e "${CYAN}"
    cat << "EOF"
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║      Vercel Environment Variable Migration Helper          ║
    ║                                                            ║
    ║      Move secure config from .env.local to Vercel          ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    # Verify .env.local exists
    check_env_file

    # Parse environment variables
    parse_env_vars

    # Show security notice
    print_warning "This tool will display your environment variables!"
    echo "Ensure you are in a private environment where no one can see your screen."
    echo ""
    read -p "Press Enter to continue... " -r

    # Show menu
    show_menu
}

# Run main function
main "$@"
