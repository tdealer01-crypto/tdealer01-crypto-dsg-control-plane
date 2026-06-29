#!/usr/bin/env bash
set -euo pipefail

# setup-mcp-complete.sh
# Complete MCP setup for DSG Control Plane:
# - Validates prerequisites (Node.js, npx, .env)
# - Updates .claude/settings.json with Z.AI Vision + Web Reader servers
# - Pre-warms the npx cache for Vision server
# - Provides clear next steps
#
# Usage:
#   scripts/setup-mcp-complete.sh                    # full setup
#   scripts/setup-mcp-complete.sh --check            # validation only
#   scripts/setup-mcp-complete.sh --add-servers      # update settings.json only
#   scripts/setup-mcp-complete.sh --help             # show help
#
# Docs:
#   - docs/mcp-server/ZAI_VISION_WEB_READER.md
#   - .env.example (Z_AI_API_KEY, Z_AI_MODE)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SETTINGS_FILE="${ROOT_DIR}/.claude/settings.json"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Modes
CHECK_ONLY=false
ADD_SERVERS_ONLY=false
SHOW_HELP=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --add-servers) ADD_SERVERS_ONLY=true ;;
    --help) SHOW_HELP=true ;;
  esac
done

# Helper functions
fail() {
  echo -e "${RED}❌ ERROR: $*${NC}" >&2
  exit 1
}

ok() {
  echo -e "${GREEN}✓${NC} $*"
}

info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $*"
}

header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$*${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

show_help() {
  cat << 'EOF'
usage: scripts/setup-mcp-complete.sh [OPTIONS]

Complete MCP setup for DSG Control Plane with Z.AI Vision and Web Reader servers.

OPTIONS:
  --check           Validation only, no changes (default: false)
  --add-servers     Update .claude/settings.json with Z.AI servers only
  --help            Show this help message

ENVIRONMENT VARIABLES:
  Z_AI_API_KEY      GLM Coding Plan API key (required for live tool calls)
  Z_AI_MODE         Service platform selector (default: ZAI)

WORKFLOW:
  1. Run with --check to validate prerequisites
  2. Export Z_AI_API_KEY if not already set
  3. Run without flags to complete full setup
  4. Verify with: claude mcp list

DOCS:
  - docs/mcp-server/ZAI_VISION_WEB_READER.md
  - .env.example

EOF
  exit 0
}

if [[ "$SHOW_HELP" == "true" ]]; then
  show_help
fi

header "MCP Setup - DSG Control Plane"

# ============================================================================
# SECTION 1: PREREQUISITE CHECKS
# ============================================================================
echo ""
echo "Step 1: Checking prerequisites..."
echo ""

# 1a) Node version check
if ! command -v node >/dev/null 2>&1; then
  fail "node not found; install Node.js >= v22.0.0"
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_VERSION="$(node -v)"
if [[ "${NODE_MAJOR}" -ge 22 ]]; then
  ok "Node.js ${NODE_VERSION}"
else
  fail "Node >= 22 required (found ${NODE_VERSION})"
fi

# 1b) npx check
if ! command -v npx >/dev/null 2>&1; then
  fail "npx not found; install Node.js >= v22.0.0"
fi

NPX_VERSION="$(npx -v)"
ok "npx ${NPX_VERSION}"

# 1c) .claude/settings.json exists and is valid JSON
if [[ ! -f "$SETTINGS_FILE" ]]; then
  fail ".claude/settings.json not found at $SETTINGS_FILE"
fi

if ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$SETTINGS_FILE" 2>/dev/null; then
  fail ".claude/settings.json is not valid JSON"
fi
ok ".claude/settings.json is valid JSON"

# 1d) Check if Z.AI servers are already configured
if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).mcpServers?.['zai-vision']?0:1)" "$SETTINGS_FILE" 2>/dev/null; then
  ok "zai-vision is already configured"
  ZAI_VISION_CONFIGURED=true
else
  warn "zai-vision not configured in .claude/settings.json"
  ZAI_VISION_CONFIGURED=false
fi

if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).mcpServers?.['web-reader']?0:1)" "$SETTINGS_FILE" 2>/dev/null; then
  ok "web-reader is already configured"
  WEB_READER_CONFIGURED=true
else
  warn "web-reader not configured in .claude/settings.json"
  WEB_READER_CONFIGURED=false
fi

# 1e) Check Z_AI_API_KEY environment variable
if [[ -n "${Z_AI_API_KEY:-}" ]]; then
  ok "Z_AI_API_KEY is set in environment"
  Z_AI_KEY_SET=true
else
  warn "Z_AI_API_KEY not set in environment"
  info "See .env.example for required variables"
  Z_AI_KEY_SET=false
fi

# 1f) Check Z_AI_MODE
Z_AI_MODE="${Z_AI_MODE:-ZAI}"
ok "Z_AI_MODE: $Z_AI_MODE"

if [[ "$CHECK_ONLY" == "true" ]]; then
  echo ""
  echo -e "${GREEN}Checks complete!${NC}"
  echo ""
  if [[ "$Z_AI_KEY_SET" == "false" ]]; then
    echo "Next steps:"
    echo "  1. Export Z_AI_API_KEY: export Z_AI_API_KEY='<your-key>'"
    echo "  2. Run setup: scripts/setup-mcp-complete.sh --add-servers"
  else
    echo "Ready to add servers with: scripts/setup-mcp-complete.sh --add-servers"
  fi
  exit 0
fi

# ============================================================================
# SECTION 2: ADD MCP SERVERS TO .claude/settings.json
# ============================================================================
if [[ "$ZAI_VISION_CONFIGURED" == "false" ]] || [[ "$WEB_READER_CONFIGURED" == "false" ]]; then
  echo ""
  echo "Step 2: Updating .claude/settings.json with Z.AI servers..."
  echo ""

  # Create temporary file with updated config
  TMP_SETTINGS=$(mktemp)

  # Use Node.js to merge configs (handles JSON safely)
  node << 'NODE_SCRIPT' "$SETTINGS_FILE" "$TMP_SETTINGS"
const fs = require('fs');
const path = require('path');

const settingsPath = process.argv[1];
const tmpPath = process.argv[2];

// Read current settings
let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// Ensure mcpServers exists
if (!settings.mcpServers) {
  settings.mcpServers = {};
}

// Add Z.AI Vision server if not present
if (!settings.mcpServers['zai-vision']) {
  settings.mcpServers['zai-vision'] = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@z_ai/mcp-server@latest'],
    env: {
      Z_AI_API_KEY: '${Z_AI_API_KEY}',
      Z_AI_MODE: '${Z_AI_MODE}'
    }
  };
}

// Add Z.AI Web Reader server if not present
if (!settings.mcpServers['web-reader']) {
  settings.mcpServers['web-reader'] = {
    type: 'http',
    url: 'https://api.z.ai/api/mcp/web_reader/mcp',
    headers: {
      Authorization: 'Bearer ${Z_AI_API_KEY}'
    }
  };
}

// Write updated settings
fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
NODE_SCRIPT

  # Verify temp file
  if ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$TMP_SETTINGS" 2>/dev/null; then
    rm -f "$TMP_SETTINGS"
    fail "Failed to update .claude/settings.json"
  fi

  # Backup original and replace
  cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
  mv "$TMP_SETTINGS" "$SETTINGS_FILE"

  ok "Updated .claude/settings.json"
  info "Backup saved to .claude/settings.json.backup"

  # Verify it worked
  if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).mcpServers?.['zai-vision']?0:1)" "$SETTINGS_FILE" 2>/dev/null; then
    ok "zai-vision configuration verified"
  else
    fail "zai-vision configuration failed"
  fi

  if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).mcpServers?.['web-reader']?0:1)" "$SETTINGS_FILE" 2>/dev/null; then
    ok "web-reader configuration verified"
  else
    fail "web-reader configuration failed"
  fi
else
  info "Both Z.AI servers already configured"
fi

# ============================================================================
# SECTION 3: PRE-WARM NPX CACHE (if not CHECK_ONLY)
# ============================================================================
if [[ "$Z_AI_KEY_SET" == "true" ]]; then
  echo ""
  echo "Step 3: Pre-warming Z.AI Vision server cache..."
  echo ""

  if npx -y @z_ai/mcp-server@latest --help >/dev/null 2>&1; then
    ok "Z.AI Vision server package cached"
  else
    warn "Pre-warm returned non-zero (package may still have cached)"
  fi
fi

# ============================================================================
# SECTION 4: SUMMARY & NEXT STEPS
# ============================================================================
header "Setup Complete!"

echo ""
echo "Configuration Summary:"
echo "  • Node.js:        $NODE_VERSION"
echo "  • npx:            $NPX_VERSION"
echo "  • Z.AI Mode:      $Z_AI_MODE"
echo "  • Settings:       $SETTINGS_FILE"
if [[ "$Z_AI_KEY_SET" == "true" ]]; then
  echo "  • Z_AI_API_KEY:   ✓ Set"
else
  echo "  • Z_AI_API_KEY:   ⚠ Not set (export before running Claude Code)"
fi

echo ""
echo "Next Steps:"
echo "  1. If Z_AI_API_KEY not set, export it:"
echo "     export Z_AI_API_KEY='<your-glm-coding-plan-key>'"
echo ""
echo "  2. Verify MCP servers are loaded in Claude Code:"
echo "     claude mcp list"
echo ""
echo "  3. Test Z.AI Vision tools (screenshot/image analysis):"
echo "     - Take a screenshot in your project"
echo "     - Ask Claude: 'What does this screenshot show?'"
echo ""
echo "  4. Test Z.AI Web Reader (webpage fetching):"
echo "     - Ask Claude: 'Read https://example.com and summarize'"
echo ""
echo "Documentation:"
echo "  • Full guide: docs/mcp-server/ZAI_VISION_WEB_READER.md"
echo "  • Environment: .env.example"
echo ""
