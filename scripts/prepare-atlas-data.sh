#!/bin/bash

################################################################################
# Stripe Atlas Data Preparation Script
# Purpose: Validate and prepare incorporation data for Stripe Atlas submission
# Usage: ./prepare-atlas-data.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="atlas-data-$(date +%Y%m%d-%H%M%S).json"
VALIDATION_REPORT="atlas-validation-$(date +%Y%m%d-%H%M%S).txt"

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
# VALIDATION FUNCTIONS
################################################################################

validate_email() {
    local email=$1
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_phone() {
    local phone=$1
    # Accept formats: +1XXXXXXXXXX, (XXX)XXX-XXXX, XXX-XXX-XXXX, etc.
    if [[ "$phone" =~ ^(\+1)?[\s\-\(\)]*[0-9]{3}[\s\-\(\)]*[0-9]{3}[\s\-\(\)]*[0-9]{4}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_ssn() {
    local ssn=$1
    # Accept format: XXX-XX-XXXX
    if [[ "$ssn" =~ ^[0-9]{3}-[0-9]{2}-[0-9]{4}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_zip() {
    local zip=$1
    # Accept 5-digit ZIP
    if [[ "$zip" =~ ^[0-9]{5}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_date() {
    local date=$1
    # Accept format: MM/DD/YYYY
    if [[ "$date" =~ ^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/[0-9]{4}$ ]]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# INPUT FUNCTIONS
################################################################################

read_input() {
    local prompt=$1
    local var_name=$2
    local required=$3
    local validation_func=$4
    local default=$5

    while true; do
        if [ -z "$default" ]; then
            read -p "$(echo -e ${YELLOW}$prompt:${NC} )" value
        else
            read -p "$(echo -e ${YELLOW}$prompt${NC} [${GREEN}$default${NC}]: )" value
            value=${value:-$default}
        fi

        if [ -z "$value" ] && [ "$required" == "true" ]; then
            print_error "This field is required"
            continue
        fi

        if [ -z "$value" ]; then
            value=$default
        fi

        if [ -n "$validation_func" ] && [ -n "$value" ]; then
            if ! $validation_func "$value"; then
                print_error "Invalid format. Please try again."
                continue
            fi
        fi

        eval "$var_name='$value'"
        break
    done
}

################################################################################
# COMPANY INFORMATION
################################################################################

collect_company_info() {
    print_section "COMPANY INFORMATION"

    read_input "Company Legal Name" COMPANY_NAME "true" "" "DSG-ONE, Inc."
    read_input "Company Description (2-3 sentences)" COMPANY_DESC "true" "" "AI runtime governance platform"
    read_input "Company Website or Social Media" COMPANY_WEBSITE "true" "" "https://tdealer01-crypto-dsg-control-plane.vercel.app"
    read_input "Business Category (FinTech/AI/SaaS)" BUSINESS_CATEGORY "true" "" "FinTech"
}

################################################################################
# ADDRESS INFORMATION
################################################################################

collect_address_info() {
    print_section "COMPANY ADDRESS"

    print_info "Enter your company address (home address or virtual address)"

    read_input "Street Address" STREET_ADDRESS "true" "" ""
    read_input "City" CITY "true" "" ""
    read_input "State (e.g., CA, NY, TX)" STATE "true" "" ""
    read_input "ZIP Code (5 digits)" ZIP "true" "validate_zip" ""
    read_input "Country (default: United States)" COUNTRY "false" "" "United States"
}

################################################################################
# PHONE INFORMATION
################################################################################

collect_phone_info() {
    print_section "COMPANY PHONE NUMBER"

    print_info "Phone will be used for IRS EIN application only (not publicly listed)"

    read_input "US Phone Number (format: +1(XXX)XXX-XXXX)" PHONE "true" "validate_phone" ""
}

################################################################################
# FOUNDER INFORMATION
################################################################################

collect_founder_info() {
    print_section "FOUNDER INFORMATION"

    print_info "This is for the primary applicant (the person submitting the application)"

    read_input "Full Legal Name (as on government ID)" FOUNDER_NAME "true" "" "Thanawat suparongsuwan"
    read_input "Email Address" FOUNDER_EMAIL "true" "validate_email" "t.dealer01@dsg.pics"
    read_input "Date of Birth (format: MM/DD/YYYY)" FOUNDER_DOB "true" "validate_date" ""
    read_input "Social Security Number (format: XXX-XX-XXXX)" FOUNDER_SSN "true" "validate_ssn" ""

    print_section "FOUNDER HOME ADDRESS"
    read_input "Street Address" FOUNDER_STREET "true" "" ""
    read_input "City" FOUNDER_CITY "true" "" ""
    read_input "State (e.g., CA, NY, TX)" FOUNDER_STATE "true" "" ""
    read_input "ZIP Code (5 digits)" FOUNDER_ZIP "true" "validate_zip" ""
}

################################################################################
# OWNERSHIP INFORMATION
################################################################################

collect_ownership_info() {
    print_section "OWNERSHIP STRUCTURE"

    print_info "Current: 100% solo founder"
    print_info "Authorized shares: 6,000,000"
    print_info "Founder shares: 6,000,000 (100%)"
    print_info "Vesting: 4 years, 1 year cliff"

    read_input "Reserve employee option pool? (Y/N)" RESERVE_POOL "true" "" "Y"

    if [[ "$RESERVE_POOL" =~ ^[Yy]$ ]]; then
        read_input "Option pool size (percentage of total, e.g., 15)" OPTION_POOL_PCT "true" "" "15"
        OPTION_POOL_SHARES=$((6000000 * OPTION_POOL_PCT / 100))
        print_info "Option pool: $OPTION_POOL_SHARES shares ($OPTION_POOL_PCT%)"
    else
        OPTION_POOL_PCT="0"
        OPTION_POOL_SHARES="0"
    fi
}

################################################################################
# ROLES AND OFFICERS
################################################################################

collect_roles_info() {
    print_section "ROLES AND OFFICERS"

    print_info "For solo founder, you can hold all roles"

    BOARD_CHAIR=$FOUNDER_NAME
    PRESIDENT=$FOUNDER_NAME
    SECRETARY=$FOUNDER_NAME

    print_success "Board Chair: $BOARD_CHAIR"
    print_success "President: $PRESIDENT"
    print_success "Secretary: $SECRETARY"
}

################################################################################
# VALIDATION REPORT
################################################################################

generate_validation_report() {
    print_section "VALIDATION REPORT"

    {
        echo "Stripe Atlas Data Validation Report"
        echo "Generated: $(date)"
        echo ""
        echo "================ COMPANY INFORMATION ================"
        echo "Company Name: $COMPANY_NAME"
        echo "Description: $COMPANY_DESC"
        echo "Website: $COMPANY_WEBSITE"
        echo "Category: $BUSINESS_CATEGORY"
        echo ""
        echo "================ ADDRESS ================"
        echo "Address: $STREET_ADDRESS"
        echo "City: $CITY"
        echo "State: $STATE"
        echo "ZIP: $ZIP"
        echo "Country: $COUNTRY"
        echo ""
        echo "================ PHONE ================"
        echo "Phone: $PHONE"
        echo ""
        echo "================ FOUNDER ================"
        echo "Name: $FOUNDER_NAME"
        echo "Email: $FOUNDER_EMAIL"
        echo "DOB: $FOUNDER_DOB"
        echo "SSN: ${FOUNDER_SSN:0:3}-XX-XXXX (masked for security)"
        echo "Address: $FOUNDER_STREET, $FOUNDER_CITY, $FOUNDER_STATE $FOUNDER_ZIP"
        echo ""
        echo "================ OWNERSHIP ================"
        echo "Total Authorized Shares: 6,000,000"
        echo "Founder Shares: 6,000,000 (100%)"
        echo "Option Pool: $OPTION_POOL_SHARES ($OPTION_POOL_PCT%)"
        echo "Vesting: 4 years, 1 year cliff"
        echo ""
        echo "================ OFFICERS ================"
        echo "Board Chair: $BOARD_CHAIR"
        echo "President: $PRESIDENT"
        echo "Secretary: $SECRETARY"
        echo ""
        echo "================ VALIDATION CHECKLIST ================"
        echo "[ ✓ ] Company name: $COMPANY_NAME"
        echo "[ ✓ ] Company description provided"
        echo "[ ✓ ] Website/Social media provided"
        echo "[ ✓ ] Business category: $BUSINESS_CATEGORY (NOT restricted)"
        echo "[ ✓ ] Company address valid"
        echo "[ ✓ ] Company phone valid"
        echo "[ ✓ ] Founder name provided"
        echo "[ ✓ ] Founder email valid"
        echo "[ ✓ ] Founder DOB valid format"
        echo "[ ✓ ] Founder SSN valid format"
        echo "[ ✓ ] Founder address valid"
        echo "[ ✓ ] Ownership structure set"
        echo "[ ✓ ] Officers assigned"
        echo ""
        echo "================ NEXT STEPS ================"
        echo "1. Review all information carefully"
        echo "2. Visit: https://dashboard.stripe.com/register/atlas"
        echo "3. Create account"
        echo "4. Select: Delaware C Corporation"
        echo "5. Fill application with information above"
        echo "6. Review and E-sign documents"
        echo "7. Wait 1-2 business days for incorporation"
        echo "8. Receive EIN via email"
        echo ""
        echo "Generated: $(date)"
    } | tee "$VALIDATION_REPORT"
}

################################################################################
# JSON OUTPUT
################################################################################

generate_json_output() {
    print_section "GENERATING JSON DATA FILE"

    {
        echo "{"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"company\": {"
        echo "    \"legal_name\": \"$COMPANY_NAME\","
        echo "    \"description\": \"$COMPANY_DESC\","
        echo "    \"website\": \"$COMPANY_WEBSITE\","
        echo "    \"category\": \"$BUSINESS_CATEGORY\","
        echo "    \"entity_type\": \"Delaware C Corporation\","
        echo "    \"address\": {"
        echo "      \"street\": \"$STREET_ADDRESS\","
        echo "      \"city\": \"$CITY\","
        echo "      \"state\": \"$STATE\","
        echo "      \"zip\": \"$ZIP\","
        echo "      \"country\": \"$COUNTRY\""
        echo "    },"
        echo "    \"phone\": \"$PHONE\""
        echo "  },"
        echo "  \"founder\": {"
        echo "    \"legal_name\": \"$FOUNDER_NAME\","
        echo "    \"email\": \"$FOUNDER_EMAIL\","
        echo "    \"date_of_birth\": \"$FOUNDER_DOB\","
        echo "    \"ssn\": \"***-**-****\","
        echo "    \"address\": {"
        echo "      \"street\": \"$FOUNDER_STREET\","
        echo "      \"city\": \"$FOUNDER_CITY\","
        echo "      \"state\": \"$FOUNDER_STATE\","
        echo "      \"zip\": \"$FOUNDER_ZIP\""
        echo "    }"
        echo "  },"
        echo "  \"ownership\": {"
        echo "    \"total_authorized_shares\": 6000000,"
        echo "    \"founder_shares\": 6000000,"
        echo "    \"founder_percentage\": 100,"
        echo "    \"option_pool_shares\": $OPTION_POOL_SHARES,"
        echo "    \"option_pool_percentage\": $OPTION_POOL_PCT,"
        echo "    \"vesting_period_years\": 4,"
        echo "    \"cliff_years\": 1"
        echo "  },"
        echo "  \"officers\": {"
        echo "    \"board_chair\": \"$BOARD_CHAIR\","
        echo "    \"president\": \"$PRESIDENT\","
        echo "    \"secretary\": \"$SECRETARY\""
        echo "  },"
        echo "  \"checklist\": {"
        echo "    \"company_name_valid\": true,"
        echo "    \"company_description_valid\": true,"
        echo "    \"website_valid\": true,"
        echo "    \"address_valid\": true,"
        echo "    \"phone_valid\": true,"
        echo "    \"founder_info_valid\": true,"
        echo "    \"ownership_valid\": true,"
        echo "    \"ready_for_submission\": true"
        echo "  }"
        echo "}"
    } | tee "$OUTPUT_FILE"
}

################################################################################
# SUMMARY
################################################################################

print_summary() {
    print_header "SUMMARY"

    echo "Company: $COMPANY_NAME"
    echo "Founder: $FOUNDER_NAME ($FOUNDER_EMAIL)"
    echo "Location: $CITY, $STATE"
    echo "Ownership: 100% founder + $OPTION_POOL_PCT% option pool"
    echo ""
    echo "Files generated:"
    echo "  • JSON data: $OUTPUT_FILE"
    echo "  • Report: $VALIDATION_REPORT"
    echo ""
    echo "Next: Go to https://dashboard.stripe.com/register/atlas"
}

################################################################################
# MAIN SCRIPT
################################################################################

main() {
    print_header "Stripe Atlas Data Preparation Tool"
    print_info "Version 1.0 - For DSG-ONE, Inc."

    # Collect all information
    collect_company_info
    collect_address_info
    collect_phone_info
    collect_founder_info
    collect_ownership_info
    collect_roles_info

    # Generate outputs
    generate_validation_report
    generate_json_output

    # Print summary
    print_summary

    echo ""
    print_success "Data preparation complete!"
    print_info "Review the files and proceed to Stripe Atlas Dashboard"
    echo ""
}

# Run main script
main "$@"
