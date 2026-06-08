#!/bin/bash
################################################################################
# Environment Variable Setup Wizard
# Interactive guide for Phase 8 deployment environment configuration
# Usage: ./scripts/env-setup-wizard.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.local"
BACKUP_FILE=".env.local.backup.$(date +%s)"

# Array to store environment variables
declare -A ENV_VARS

# Array to track which variables are set
declare -A VAR_STATUS

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

# Load existing .env.local if it exists
load_existing_env() {
    if [[ -f "$ENV_FILE" ]]; then
        print_info "Found existing $ENV_FILE. Loading previous values..."
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ "$key" =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            ENV_VARS["$key"]="$value"
        done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
        print_success "Loaded existing configuration"
    fi
}

# Validate Stripe key format (sk_live_ or sk_test_)
validate_stripe_secret() {
    local value="$1"
    if [[ -z "$value" ]]; then
        return 0  # Empty is allowed
    fi
    if [[ "$value" =~ ^sk_(live|test)_.+ ]]; then
        return 0
    fi
    return 1
}

# Validate Stripe publishable key format (pk_live_ or pk_test_)
validate_stripe_public() {
    local value="$1"
    if [[ -z "$value" ]]; then
        return 0  # Empty is allowed
    fi
    if [[ "$value" =~ ^pk_(live|test)_.+ ]]; then
        return 0
    fi
    return 1
}

# Validate Supabase URL format
validate_supabase_url() {
    local value="$1"
    if [[ -z "$value" ]]; then
        return 0  # Empty is allowed
    fi
    if [[ "$value" =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
        return 0
    fi
    return 1
}

# Validate URL format (http/https)
validate_url() {
    local value="$1"
    if [[ -z "$value" ]]; then
        return 0  # Empty is allowed
    fi
    if [[ "$value" =~ ^https?:// ]]; then
        return 0
    fi
    return 1
}

# Validate that value is not empty
validate_required() {
    local value="$1"
    [[ -n "$value" ]]
}

# Validate key format (generic alphanumeric with allowed special chars)
validate_key_format() {
    local value="$1"
    if [[ -z "$value" ]]; then
        return 0  # Empty is allowed
    fi
    if [[ "$value" =~ ^[a-zA-Z0-9_\-\.]+$ ]]; then
        return 0
    fi
    return 1
}

# Prompt for a single environment variable
prompt_for_var() {
    local var_name="$1"
    local var_description="$2"
    local var_example="$3"
    local validation_type="$4"

    local current_value="${ENV_VARS[$var_name]:-}"
    local current_display=""

    if [[ -n "$current_value" ]]; then
        current_display=" ${CYAN}[current: ***hidden***]${NC}"
        VAR_STATUS[$var_name]="SET"
    else
        VAR_STATUS[$var_name]="MISSING"
    fi

    echo -e "${BLUE}${var_name}${NC}${current_display}"
    echo -e "  ${var_description}"
    echo -e "  Example: ${CYAN}${var_example}${NC}"

    while true; do
        read -p "  Enter value (or press Enter to skip): " user_input

        # Allow skipping
        if [[ -z "$user_input" ]]; then
            if [[ -n "$current_value" ]]; then
                echo -e "  ${GREEN}(keeping existing value)${NC}"
            else
                echo -e "  ${YELLOW}(skipped)${NC}"
            fi
            return 0
        fi

        # Validate input based on type
        case "$validation_type" in
            "stripe_secret")
                if ! validate_stripe_secret "$user_input"; then
                    print_error "Invalid Stripe secret key. Must start with 'sk_live_' or 'sk_test_'"
                    continue
                fi
                ;;
            "stripe_public")
                if ! validate_stripe_public "$user_input"; then
                    print_error "Invalid Stripe publishable key. Must start with 'pk_live_' or 'pk_test_'"
                    continue
                fi
                ;;
            "supabase_url")
                if ! validate_supabase_url "$user_input"; then
                    print_error "Invalid Supabase URL. Must be: https://[project].supabase.co"
                    continue
                fi
                ;;
            "url")
                if ! validate_url "$user_input"; then
                    print_error "Invalid URL. Must start with http:// or https://"
                    continue
                fi
                ;;
            "key_format")
                if ! validate_key_format "$user_input"; then
                    print_error "Invalid format. Use alphanumeric characters, hyphens, underscores, and dots only"
                    continue
                fi
                ;;
            "optional")
                # No validation
                ;;
        esac

        # Update the variable
        ENV_VARS[$var_name]="$user_input"
        VAR_STATUS[$var_name]="SET"
        print_success "Saved $var_name"
        return 0
    done
}

# Show summary of configuration
show_summary() {
    print_header "Configuration Summary"

    local set_count=0
    local missing_count=0

    echo -e "${BLUE}Stripe Configuration:${NC}"
    for var in "STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET" "STRIPE_PRICE_PRO" "STRIPE_PRICE_BUSINESS"; do
        if [[ "${VAR_STATUS[$var]}" == "SET" ]]; then
            echo -e "  ${GREEN}✓${NC} $var"
            ((set_count++))
        else
            echo -e "  ${YELLOW}○${NC} $var (optional)"
            ((missing_count++))
        fi
    done

    echo -e "\n${BLUE}Supabase Configuration:${NC}"
    for var in "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY"; do
        if [[ "${VAR_STATUS[$var]}" == "SET" ]]; then
            echo -e "  ${GREEN}✓${NC} $var"
            ((set_count++))
        else
            echo -e "  ${YELLOW}○${NC} $var (optional)"
            ((missing_count++))
        fi
    done

    echo -e "\n${BLUE}Application URLs:${NC}"
    for var in "NEXT_PUBLIC_APP_URL" "APP_URL"; do
        if [[ "${VAR_STATUS[$var]}" == "SET" ]]; then
            echo -e "  ${GREEN}✓${NC} $var"
            ((set_count++))
        else
            echo -e "  ${YELLOW}○${NC} $var"
            ((missing_count++))
        fi
    done

    echo -e "\n${BLUE}Additional Configuration:${NC}"
    for var in "DSG_ALLOWED_ORIGINS" "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN"; do
        if [[ "${VAR_STATUS[$var]}" == "SET" ]]; then
            echo -e "  ${GREEN}✓${NC} $var"
            ((set_count++))
        else
            echo -e "  ${YELLOW}○${NC} $var (optional)"
            ((missing_count++))
        fi
    done

    echo -e "\n${CYAN}Total: ${GREEN}${set_count} configured${NC} | ${YELLOW}${missing_count} optional${NC}"
}

# Save environment variables to .env.local
save_env_file() {
    # Create backup if file exists
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        print_info "Backed up existing $ENV_FILE to $BACKUP_FILE"
    fi

    # Write new file
    {
        echo "# ============ Application URLs ============"
        echo "NEXT_PUBLIC_APP_URL=${ENV_VARS[NEXT_PUBLIC_APP_URL]:-}"
        echo "APP_URL=${ENV_VARS[APP_URL]:-}"
        echo ""
        echo "# ============ Stripe Billing ============"
        echo "STRIPE_SECRET_KEY=${ENV_VARS[STRIPE_SECRET_KEY]:-}"
        echo "STRIPE_WEBHOOK_SECRET=${ENV_VARS[STRIPE_WEBHOOK_SECRET]:-}"
        echo "STRIPE_PRICE_PRO=${ENV_VARS[STRIPE_PRICE_PRO]:-}"
        echo "STRIPE_PRICE_BUSINESS=${ENV_VARS[STRIPE_PRICE_BUSINESS]:-}"
        echo ""
        echo "# ============ Supabase ============"
        echo "NEXT_PUBLIC_SUPABASE_URL=${ENV_VARS[NEXT_PUBLIC_SUPABASE_URL]:-}"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ENV_VARS[NEXT_PUBLIC_SUPABASE_ANON_KEY]:-}"
        echo "SUPABASE_SERVICE_ROLE_KEY=${ENV_VARS[SUPABASE_SERVICE_ROLE_KEY]:-}"
        echo ""
        echo "# ============ Caching & Performance ============"
        echo "UPSTASH_REDIS_REST_URL=${ENV_VARS[UPSTASH_REDIS_REST_URL]:-}"
        echo "UPSTASH_REDIS_REST_TOKEN=${ENV_VARS[UPSTASH_REDIS_REST_TOKEN]:-}"
        echo ""
        echo "# ============ CORS & Security ============"
        echo "DSG_ALLOWED_ORIGINS=${ENV_VARS[DSG_ALLOWED_ORIGINS]:-}"
        echo ""
        echo "# DO NOT COMMIT THIS FILE"
        echo "# It contains sensitive API keys and secrets."
        echo "# See: docs/ENV_VARS_SECURITY_GUIDE.md"
    } > "$ENV_FILE"

    chmod 600 "$ENV_FILE"
    print_success "Saved configuration to $ENV_FILE (mode 600)"
}

# Interactive menu mode
show_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}  Configuration Menu${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "  1) Configure all variables"
        echo "  2) Edit individual variable"
        echo "  3) Show current configuration status"
        echo "  4) Save and exit"
        echo "  5) Exit without saving"
        echo ""
        read -p "Select option [1-5]: " menu_choice

        case $menu_choice in
            1)
                configure_all_vars
                ;;
            2)
                edit_individual_var
                ;;
            3)
                show_summary
                ;;
            4)
                if prompt_confirm "Save configuration to $ENV_FILE?"; then
                    save_env_file
                    print_success "Configuration saved. You can now use 'npm run dev'"
                    exit 0
                fi
                ;;
            5)
                print_warning "Exiting without saving..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
    done
}

# Configure all variables sequentially
configure_all_vars() {
    clear
    print_header "Phase 8 Environment Variable Configuration"

    print_section "Application URLs (Required)"
    prompt_for_var \
        "APP_URL" \
        "Your application's base URL (for server-side operations)" \
        "https://example.com or http://localhost:3000" \
        "url"

    prompt_for_var \
        "NEXT_PUBLIC_APP_URL" \
        "Public-facing application URL (visible to browsers)" \
        "https://example.com or http://localhost:3000" \
        "url"

    print_section "Stripe Billing Configuration"
    prompt_for_var \
        "STRIPE_SECRET_KEY" \
        "Stripe secret API key for server-side operations" \
        "sk_live_... or sk_test_..." \
        "stripe_secret"

    prompt_for_var \
        "STRIPE_WEBHOOK_SECRET" \
        "Stripe webhook signing secret for validating incoming webhooks" \
        "whsec_..." \
        "key_format"

    prompt_for_var \
        "STRIPE_PRICE_PRO" \
        "Stripe price ID for Pro plan" \
        "price_1234567890..." \
        "key_format"

    prompt_for_var \
        "STRIPE_PRICE_BUSINESS" \
        "Stripe price ID for Business plan" \
        "price_0987654321..." \
        "key_format"

    print_section "Supabase Database Configuration"
    prompt_for_var \
        "NEXT_PUBLIC_SUPABASE_URL" \
        "Your Supabase project URL" \
        "https://project-id.supabase.co" \
        "supabase_url"

    prompt_for_var \
        "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        "Supabase anonymous/public key for client-side access" \
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
        "optional"

    prompt_for_var \
        "SUPABASE_SERVICE_ROLE_KEY" \
        "Supabase service role key (SERVER-SIDE ONLY - DO NOT expose to client)" \
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
        "optional"

    print_section "Caching & Performance (Redis/Upstash)"
    prompt_for_var \
        "UPSTASH_REDIS_REST_URL" \
        "Upstash Redis REST API URL for distributed caching" \
        "https://....upstash.io" \
        "url"

    prompt_for_var \
        "UPSTASH_REDIS_REST_TOKEN" \
        "Upstash Redis REST API authentication token" \
        "AXX..." \
        "optional"

    print_section "CORS & Security"
    prompt_for_var \
        "DSG_ALLOWED_ORIGINS" \
        "Comma-separated list of allowed origins for API access" \
        "https://example.com,https://app.example.com" \
        "optional"
}

# Edit individual variable
edit_individual_var() {
    clear
    print_header "Edit Individual Variable"

    echo "Available variables:"
    local idx=1
    local -a vars=()

    for var in "NEXT_PUBLIC_APP_URL" "APP_URL" "STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET" \
               "STRIPE_PRICE_PRO" "STRIPE_PRICE_BUSINESS" "NEXT_PUBLIC_SUPABASE_URL" \
               "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" \
               "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN" "DSG_ALLOWED_ORIGINS"; do
        vars+=("$var")
        local status="${VAR_STATUS[$var]:-MISSING}"
        if [[ "$status" == "SET" ]]; then
            echo "  ${GREEN}$idx)${NC} $var ${GREEN}[SET]${NC}"
        else
            echo "  ${YELLOW}$idx)${NC} $var ${YELLOW}[MISSING]${NC}"
        fi
        ((idx++))
    done

    echo "  0) Back to menu"
    read -p "Select variable to edit [0-$((${#vars[@]}))] or enter variable name: " choice

    if [[ "$choice" == "0" ]]; then
        return
    fi

    # Handle numeric selection
    if [[ "$choice" =~ ^[0-9]+$ ]] && ((choice > 0 && choice <= ${#vars[@]})); then
        selected_var="${vars[$((choice - 1))]}"
    else
        # Treat as direct variable name
        selected_var="$choice"
    fi

    # Find validation type
    local validation_type="optional"
    case "$selected_var" in
        *STRIPE_SECRET*)
            validation_type="stripe_secret"
            ;;
        *STRIPE*|*PRICE*)
            validation_type="key_format"
            ;;
        *SUPABASE_URL*)
            validation_type="supabase_url"
            ;;
        *URL*)
            validation_type="url"
            ;;
    esac

    echo ""
    prompt_for_var "$selected_var" "Edit this variable" "" "$validation_type"
}

# Confirm action
prompt_confirm() {
    local prompt="$1"
    read -p "$(echo -e ${YELLOW}${prompt}${NC}) (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
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
    ║      Phase 8 Environment Variable Setup Wizard             ║
    ║                                                            ║
    ║      Secure configuration guide for DSG Control Plane      ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    # Check for .gitignore entry
    if ! grep -q "\.env\.local" .gitignore 2>/dev/null; then
        print_warning ".env.local not found in .gitignore!"
        print_warning "This is a SECURITY RISK. Add it to .gitignore immediately:"
        echo -e "  ${CYAN}echo '.env.local' >> .gitignore${NC}"
    fi

    # Load existing configuration
    load_existing_env

    # Show menu
    show_menu
}

# Run main function
main "$@"
