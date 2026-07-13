#!/bin/bash
# AI-Firstify Migration Deployment Helper
# Applies migrations to Supabase project

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://zeyguilldygozufpgxms.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
  echo "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ./scripts/apply-ai-firstify-migrations.sh"
  exit 1
fi

echo "🚀 AI-Firstify Migration Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project: $SUPABASE_URL"
echo ""

# Function to execute SQL
execute_sql() {
  local sql_file=$1
  local migration_name=$(basename "$sql_file")

  echo "📝 Applying: $migration_name"

  # Read SQL content and execute via REST API
  local sql_content=$(cat "$sql_file")

  # Execute via Supabase SQL endpoint
  curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/sql_execute" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql_content" | jq -Rs '.')}" > /dev/null 2>&1 || {
    # Fallback: Show instructions for manual execution
    echo "⚠️  Could not apply via REST API"
    echo "📋 Please run this SQL manually in Supabase dashboard SQL editor:"
    echo "---"
    echo "$sql_content"
    echo "---"
    return 1
  }

  echo "✅ $migration_name applied"
}

# Apply migrations
MIGRATIONS=(
  "supabase/migrations/20260713050000_ai_firstify_core_schema.sql"
  "supabase/migrations/20260713050100_ai_firstify_audit_logs.sql"
  "supabase/migrations/20260713050300_ai_firstify_simplify_rls.sql"
)

echo "📦 Executing migrations..."
echo ""

for migration in "${MIGRATIONS[@]}"; do
  if [ ! -f "$migration" ]; then
    echo "❌ Error: $migration not found"
    exit 1
  fi

  execute_sql "$migration" || {
    echo ""
    echo "⚠️  Migration failed or requires manual execution"
    echo "Please run the SQL manually in Supabase dashboard"
    exit 1
  }

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All migrations applied successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. npm run db:types          # Generate TypeScript types"
echo "  2. npm run typecheck         # Verify TypeScript"
echo "  3. npm run build             # Build application"
echo "  4. npm run deploy:prod       # Deploy to production"
echo ""
echo "🔗 Supabase Project: $SUPABASE_URL"
