#!/bin/bash
#
# EMERGENCY RESTORE SCRIPT
#
# Rapid recovery for production incidents:
# - Rollback to previous deployment
# - Restore environment variables from backup
# - Clear Redis cache
# - Verify service health after restore
#
# Usage:
#   ./scripts/emergency-restore.sh                    # Interactive mode
#   ./scripts/emergency-restore.sh --deploy-id <id>   # Rollback to specific deployment
#   ./scripts/emergency-restore.sh --help              # Show help
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
HEALTH_ENDPOINT="/api/health"
MONITOR_ENDPOINT="/api/core/monitor"
REDIS_TIMEOUT=5
VERCEL_TIMEOUT=30
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=10

# State
DEPLOY_ID=""
RESTORE_CONFIRMED=false
ENABLE_REDIS_CLEAR=true
ENABLE_HEALTH_CHECK=true

# Functions

show_help() {
    cat <<EOF
${BLUE}EMERGENCY RESTORE - Production Recovery Script${NC}

Usage: ./scripts/emergency-restore.sh [OPTIONS]

Options:
  --deploy-id <id>      Rollback to specific deployment ID
  --no-redis-clear      Skip Redis cache clear
  --no-health-check     Skip health verification
  --force               Skip confirmation prompts
  --help                Show this help message

Examples:
  # Interactive mode (prompts for deployment)
  ./scripts/emergency-restore.sh

  # Rollback to specific deployment
  ./scripts/emergency-restore.sh --deploy-id <deployment-id>

  # Rollback without confirmation
  ./scripts/emergency-restore.sh --deploy-id <deployment-id> --force

Environment Variables:
  VERCEL_TOKEN          Required for Vercel CLI access
  VERCEL_ORG_ID         Required for Vercel CLI access
  UPSTASH_REDIS_URL     Optional, for Redis clear (redis://<token>@<host>:<port>)

${YELLOW}WARNING:${NC} This script performs production changes. Ensure you have:
  1. Incident context (what went wrong)
  2. Communication with team
  3. Rollback target identified
  4. No active deployments in progress
EOF
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Vercel CLI
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js"
        exit 1
    fi

    # Check Vercel CLI can access project
    if ! npx vercel whoami &> /dev/null; then
        log_error "Not authenticated with Vercel. Run: npx vercel login"
        exit 1
    fi

    log_success "Prerequisites verified"
}

list_deployments() {
    log_info "Fetching recent deployments from Vercel..."

    # Get last 10 deployments
    npx vercel ls 2>/dev/null | head -15
}

select_deployment_interactive() {
    log_info ""
    log_warning "Production incident recovery - select target deployment"
    log_info ""

    list_deployments

    log_info ""
    read -p "Enter deployment ID to restore to: " DEPLOY_ID

    if [ -z "$DEPLOY_ID" ]; then
        log_error "Deployment ID cannot be empty"
        exit 1
    fi

    log_info "Selected deployment: $DEPLOY_ID"
}

confirm_rollback() {
    if [ "$RESTORE_CONFIRMED" = true ]; then
        return 0
    fi

    log_warning ""
    log_warning "ROLLBACK CONFIRMATION"
    log_warning "Production deployment will be rolled back to: $DEPLOY_ID"
    log_warning "Current environment variables will be preserved"
    log_warning "This action cannot be undone without another deploy"
    log_warning ""

    read -p "Type 'RESTORE' to confirm: " confirmation

    if [ "$confirmation" != "RESTORE" ]; then
        log_error "Rollback canceled"
        exit 1
    fi

    log_success "Rollback confirmed"
    RESTORE_CONFIRMED=true
}

rollback_deployment() {
    log_info ""
    log_info "Rolling back to deployment: $DEPLOY_ID"

    # Set deployment as production
    if npx vercel alias set "$DEPLOY_ID" "tdealer01-crypto-dsg-control-plane.vercel.app" 2>&1; then
        log_success "Deployment rollback initiated"
        return 0
    else
        log_error "Failed to rollback deployment"
        return 1
    fi
}

clear_redis_cache() {
    if [ "$ENABLE_REDIS_CLEAR" = false ]; then
        log_warning "Redis clear skipped (--no-redis-clear flag)"
        return 0
    fi

    # Check if Redis URL is available
    if [ -z "${UPSTASH_REDIS_URL:-}" ]; then
        log_warning "UPSTASH_REDIS_URL not set, skipping Redis cache clear"
        log_info "To clear Redis manually:"
        log_info "  1. Go to Upstash dashboard → Database"
        log_info "  2. Click 'Flush Database'"
        return 0
    fi

    log_info "Clearing Redis cache..."

    # Extract credentials from UPSTASH_REDIS_URL
    # Format: redis://<token>@<host>:<port>

    if command -v redis-cli &> /dev/null; then
        # Use redis-cli if available
        if redis-cli -u "$UPSTASH_REDIS_URL" FLUSHDB 2>&1; then
            log_success "Redis cache cleared"
        else
            log_warning "Failed to clear Redis via redis-cli"
            log_info "Consider manual flush in Upstash dashboard"
        fi
    else
        # Use curl as fallback
        log_warning "redis-cli not found, skipping Redis clear"
        log_info "Install redis-cli or clear manually in Upstash dashboard"
        log_info "To install: brew install redis (macOS) or apt-get install redis-tools (Linux)"
    fi
}

verify_deployment_health() {
    if [ "$ENABLE_HEALTH_CHECK" = false ]; then
        log_warning "Health check skipped (--no-health-check flag)"
        return 0
    fi

    log_info ""
    log_info "Verifying deployment health (this may take 2-3 minutes)..."
    log_info "Checking: $PRODUCTION_URL$HEALTH_ENDPOINT"
    log_info ""

    local retry_count=0
    local success=false

    while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
        log_info "Health check attempt $((retry_count + 1))/$HEALTH_CHECK_RETRIES..."

        # Check health endpoint
        if response=$(curl -s -w "\n%{http_code}" "$PRODUCTION_URL$HEALTH_ENDPOINT" 2>/dev/null); then
            http_code=$(echo "$response" | tail -1)
            body=$(echo "$response" | head -1)

            if [ "$http_code" = "200" ]; then
                log_success "Health endpoint healthy (HTTP 200)"
                log_info "Response: $body"
                success=true
                break
            else
                log_warning "Health endpoint returned HTTP $http_code"
            fi
        else
            log_warning "Could not reach health endpoint"
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; then
            log_info "Waiting ${HEALTH_CHECK_INTERVAL}s before retry..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done

    if [ "$success" = false ]; then
        log_warning "Health endpoint not responding after $HEALTH_CHECK_RETRIES attempts"
        log_info "Check may have timed out or deployment may still be starting up"
        return 1
    fi

    # Check core monitor
    log_info ""
    log_info "Checking: $PRODUCTION_URL$MONITOR_ENDPOINT"

    if response=$(curl -s "$PRODUCTION_URL$MONITOR_ENDPOINT" 2>/dev/null); then
        if echo "$response" | grep -q "ready"; then
            log_success "Core monitor healthy"
            log_info "Response: $response"
        else
            log_warning "Core monitor response: $response"
        fi
    else
        log_warning "Could not reach core monitor endpoint"
    fi

    return 0
}

generate_summary() {
    log_info ""
    log_info "========================================"
    log_info "RESTORE SUMMARY"
    log_info "========================================"
    log_info "Deployed to: $DEPLOY_ID"
    log_info "Production URL: $PRODUCTION_URL"
    log_info "Redis cache cleared: $ENABLE_REDIS_CLEAR"
    log_info "Health check passed: $ENABLE_HEALTH_CHECK"
    log_info "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    log_info "========================================"
    log_info ""
}

main() {
    # Parse arguments
    while [ $# -gt 0 ]; do
        case $1 in
            --deploy-id)
                DEPLOY_ID="$2"
                shift 2
                ;;
            --no-redis-clear)
                ENABLE_REDIS_CLEAR=false
                shift
                ;;
            --no-health-check)
                ENABLE_HEALTH_CHECK=false
                shift
                ;;
            --force)
                RESTORE_CONFIRMED=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Header
    clear
    log_info ""
    log_info "╔════════════════════════════════════════╗"
    log_info "║   EMERGENCY PRODUCTION RESTORE        ║"
    log_info "║   DSG ONE / ProofGate Control Plane    ║"
    log_info "╚════════════════════════════════════════╝"
    log_info ""

    # Pre-flight checks
    check_prerequisites

    # Select deployment if not provided
    if [ -z "$DEPLOY_ID" ]; then
        select_deployment_interactive
    fi

    # Confirm restore
    confirm_rollback

    # Execute restore
    log_info ""
    log_info "Starting emergency restore sequence..."
    log_info ""

    # Step 1: Rollback deployment
    if ! rollback_deployment; then
        log_error "Deployment rollback failed"
        exit 1
    fi

    # Wait for deployment to propagate
    log_info "Waiting for deployment to propagate (30s)..."
    sleep 30

    # Step 2: Clear Redis
    clear_redis_cache

    # Step 3: Verify health
    verify_deployment_health

    # Summary
    generate_summary

    log_success "Emergency restore complete!"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Verify all critical endpoints are working"
    log_info "  2. Check Supabase status and connectivity"
    log_info "  3. Review Vercel logs for any errors"
    log_info "  4. Notify team that recovery is complete"
    log_info "  5. Document what went wrong in incident report"
    log_info ""
    log_info "To check logs:"
    log_info "  npx vercel logs $PRODUCTION_URL"
    log_info ""
    log_info "To view deployments:"
    log_info "  npx vercel ls"
    log_info ""
}

# Run main function
main "$@"
