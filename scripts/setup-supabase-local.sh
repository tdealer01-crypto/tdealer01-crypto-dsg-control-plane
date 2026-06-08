#!/bin/bash

# Supabase Local Setup and Verification Helper
# Links a local Supabase project to a remote project, lists pending migrations,
# and verifies connection to production database.
#
# Usage:
#   ./scripts/setup-supabase-local.sh
#   ./scripts/setup-supabase-local.sh link <PROJECT_REF>
#   ./scripts/setup-supabase-local.sh status
#   ./scripts/setup-supabase-local.sh verify-connection
#   ./scripts/setup-supabase-local.sh push
#
# Examples:
#   ./scripts/setup-supabase-local.sh                    # Interactive mode
#   ./scripts/setup-supabase-local.sh link abcdefghijk   # Link specific project
#   ./scripts/setup-supabase-local.sh status              # Check migration status
#   ./scripts/setup-supabase-local.sh push                # Apply all pending migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# ============================================================================
# Check Prerequisites
# ============================================================================

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI is not installed."
    echo ""
    echo "Install with one of:"
    echo "  npm install -g @supabase/cli"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
  fi

  log_success "Supabase CLI found: $(supabase --version)"

  # Check if we are in the repository root
  if [[ ! -d "$REPO_ROOT/supabase/migrations" ]]; then
    log_error "supabase/migrations directory not found. Are you in the repo root?"
    exit 1
  fi

  log_success "Repository structure is valid"
}

# ============================================================================
# Check Supabase Authentication
# ============================================================================

check_auth() {
  log_info "Checking Supabase authentication..."

  if ! supabase auth list &> /dev/null; then
    log_warning "Not authenticated with Supabase"
    echo ""
    echo "To authenticate, run:"
    echo "  supabase login"
    echo ""
    return 1
  fi

  log_success "Authenticated with Supabase"
  return 0
}

# ============================================================================
# Link to Remote Project
# ============================================================================

link_project() {
  local project_ref="${1:-}"

  if [[ -z "$project_ref" ]]; then
    log_info "Enter your Supabase project reference (e.g., abcdefghijk):"
    read -p "Project reference: " project_ref
  fi

  if [[ -z "$project_ref" ]]; then
    log_error "Project reference cannot be empty"
    exit 1
  fi

  log_info "Linking to project: $project_ref"

  if supabase link --project-ref "$project_ref"; then
    log_success "Project linked successfully"
    log_info "Connection string saved to .env.local"
  else
    log_error "Failed to link project"
    exit 1
  fi
}

# ============================================================================
# Show Migration Status
# ============================================================================

show_migration_status() {
  log_info "Checking migration status..."

  if ! supabase migration list; then
    log_error "Failed to get migration status"
    echo ""
    echo "Possible causes:"
    echo "  - Project is not linked (run: supabase link --project-ref <REF>)"
    echo "  - Database credentials are invalid"
    echo "  - Network connection issue"
    exit 1
  fi
}

# ============================================================================
# List Pending Migrations
# ============================================================================

list_pending_migrations() {
  log_info "Listing pending migrations..."

  local pending_count=0
  local pending_files=()

  # Check which migrations are not yet applied
  for migration_file in "$REPO_ROOT/supabase/migrations"/*.sql; do
    filename=$(basename "$migration_file")

    # Simple check: assume all files are pending unless we verify otherwise
    pending_files+=("$filename")
    ((pending_count++))
  done

  if [[ $pending_count -eq 0 ]]; then
    log_success "No migrations found"
    return 0
  fi

  log_info "Found $pending_count migration files (may be already applied):"
  printf '%s\n' "${pending_files[@]}" | sort | nl

  echo ""
  echo "Run: supabase migration list"
  echo "to see which are applied vs pending."
}

# ============================================================================
# Apply All Pending Migrations
# ============================================================================

push_migrations() {
  log_info "Applying all pending migrations..."

  if ! supabase db push; then
    log_error "Failed to push migrations"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify project is linked: supabase link --project-ref <REF>"
    echo "  2. Check migration syntax: supabase migration list"
    echo "  3. Review error message above"
    exit 1
  fi

  log_success "All migrations applied successfully"

  # Verify
  log_info "Verifying migration application..."
  if supabase migration list; then
    log_success "Migration status verified"
  fi
}

# ============================================================================
# Verify Database Connection
# ============================================================================

verify_connection() {
  log_info "Verifying database connection..."

  # Check if .env.local exists (created by supabase link)
  if [[ ! -f "$REPO_ROOT/.env.local" ]]; then
    log_warning ".env.local not found. Project may not be linked."
    return 1
  fi

  # Source .env.local to get connection string
  set +e
  source "$REPO_ROOT/.env.local"
  set -e

  if [[ -z "$SUPABASE_DB_URL" ]]; then
    log_warning "SUPABASE_DB_URL not found in .env.local"
    return 1
  fi

  log_info "Testing connection to database..."

  # Test connection with a simple query
  if psql "$SUPABASE_DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    log_success "Database connection successful"
  else
    log_warning "Could not verify connection (psql may not be installed)"
    echo ""
    echo "To test connection manually:"
    echo "  psql \$SUPABASE_DB_URL -c \"SELECT version();\""
    return 1
  fi

  # Check if stripe tables exist
  log_info "Checking if Stripe tables exist..."

  local tables_exist=false
  if psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM stripe_app_accounts;" > /dev/null 2>&1; then
    tables_exist=true
    log_success "stripe_app_accounts table found"
  fi

  if psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM stripe_operation_policies;" > /dev/null 2>&1; then
    log_success "stripe_operation_policies table found"
  fi

  if psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM stripe_operation_audits;" > /dev/null 2>&1; then
    log_success "stripe_operation_audits table found"
  fi

  if [[ "$tables_exist" = false ]]; then
    log_warning "Stripe tables not found. Have you applied migrations?"
  fi
}

# ============================================================================
# Show Environment Summary
# ============================================================================

show_summary() {
  echo ""
  echo "=========================================="
  echo "Supabase Setup Summary"
  echo "=========================================="
  echo ""

  if [[ -f "$REPO_ROOT/.env.local" ]]; then
    log_success "Project is linked"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env.local for connection details"
    echo "  2. Check migration status: supabase migration list"
    echo "  3. Apply pending migrations: supabase db push"
    echo "  4. Verify connection: ./scripts/setup-supabase-local.sh verify-connection"
  else
    log_warning "Project is not linked"
    echo ""
    echo "Next steps:"
    echo "  1. Link your project: supabase link --project-ref <PROJECT_REF>"
    echo "  2. Or use this script: ./scripts/setup-supabase-local.sh link <PROJECT_REF>"
  fi

  echo ""
  echo "Useful commands:"
  echo "  supabase status                     # Show project status"
  echo "  supabase migration list             # List migrations"
  echo "  supabase db push                    # Apply pending migrations"
  echo "  supabase db pull                    # Pull schema changes from DB"
  echo "  supabase start                      # Start local Supabase (requires Docker)"
  echo ""
}

# ============================================================================
# Interactive Mode
# ============================================================================

interactive_mode() {
  echo ""
  echo "=========================================="
  echo "Supabase Local Setup"
  echo "=========================================="
  echo ""

  echo "What would you like to do?"
  echo "1) Link a project"
  echo "2) Check migration status"
  echo "3) Apply pending migrations"
  echo "4) Verify database connection"
  echo "5) View setup summary"
  echo "6) Exit"
  echo ""

  read -p "Select option (1-6): " choice

  case $choice in
    1)
      check_auth || {
        supabase login
      }
      link_project
      ;;
    2)
      show_migration_status
      ;;
    3)
      show_migration_status
      read -p "Apply all pending migrations? (y/n): " confirm
      if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        push_migrations
      fi
      ;;
    4)
      verify_connection
      ;;
    5)
      show_summary
      ;;
    6)
      exit 0
      ;;
    *)
      log_error "Invalid option"
      interactive_mode
      ;;
  esac

  show_summary
}

# ============================================================================
# Main Script Logic
# ============================================================================

main() {
  check_prerequisites

  local command="${1:-}"

  case $command in
    link)
      check_auth || supabase login
      link_project "${2:-}"
      show_summary
      ;;
    status)
      show_migration_status
      show_summary
      ;;
    list)
      list_pending_migrations
      ;;
    push)
      show_migration_status
      read -p "Apply all pending migrations? (y/n): " confirm
      if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
        push_migrations
      fi
      show_summary
      ;;
    verify-connection)
      verify_connection
      show_summary
      ;;
    help)
      cat << 'EOF'
Supabase Local Setup Helper

Usage:
  ./scripts/setup-supabase-local.sh [COMMAND] [ARGS]

Commands:
  link [PROJECT_REF]      Link to a remote Supabase project
  status                  Check migration status
  list                    List all migration files
  push                    Apply all pending migrations
  verify-connection       Test database connection
  help                    Show this help message

Examples:
  ./scripts/setup-supabase-local.sh                    # Interactive mode
  ./scripts/setup-supabase-local.sh link abcdefghijk   # Link specific project
  ./scripts/setup-supabase-local.sh status              # Check migration status
  ./scripts/setup-supabase-local.sh push                # Apply migrations
  ./scripts/setup-supabase-local.sh verify-connection  # Verify DB connection

EOF
      ;;
    *)
      if [[ -z "$command" ]]; then
        interactive_mode
      else
        log_error "Unknown command: $command"
        echo "Run: $0 help"
        exit 1
      fi
      ;;
  esac
}

# Run main script
main "$@"
