#!/usr/bin/env bash
set -euo pipefail

# setup-zai-mcp.sh
# Verify prerequisites and (optionally) pre-warm the Z.AI Vision MCP server so
# its first tool call does not pay the npx download cost. Web Reader is a remote
# HTTP server and needs no local install.
#
# Usage:
#   scripts/setup-zai-mcp.sh           # check prereqs + pre-warm npx cache
#   scripts/setup-zai-mcp.sh --check   # checks only, no network pre-warm
#
# Docs: docs/mcp-server/ZAI_VISION_WEB_READER.md

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

fail() { echo "ERROR: $*" >&2; exit 1; }
ok()   { echo "  [ok] $*"; }

echo "== Z.AI MCP setup (Vision + Web Reader) =="

# 1) Node >= 22 (required by @z_ai/mcp-server)
command -v node >/dev/null 2>&1 || fail "node not found; install Node.js >= v22.0.0"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "${NODE_MAJOR}" -ge 22 ]] || fail "Node >= 22 required (found $(node -v))"
ok "node $(node -v)"

# 2) npx available
command -v npx >/dev/null 2>&1 || fail "npx not found"
ok "npx $(npx -v)"

# 3) .claude/settings.json is valid JSON (config the operator edits to enable)
SETTINGS="${ROOT_DIR}/.claude/settings.json"
if [[ -f "${SETTINGS}" ]]; then
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "${SETTINGS}" \
    || fail ".claude/settings.json is not valid JSON"
  ok ".claude/settings.json parses"
  if node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).mcpServers?.['zai-vision']?0:1)" "${SETTINGS}"; then
    ok "zai-vision is configured"
  else
    echo "  [info] zai-vision not yet in .claude/settings.json — see docs to enable"
  fi
fi

# 4) Key presence (name only; never printed)
if [[ -n "${Z_AI_API_KEY:-}" ]]; then
  ok "Z_AI_API_KEY is set"
else
  echo "  [info] Z_AI_API_KEY not set in this shell — live tool calls will fail until exported"
fi

if [[ "${CHECK_ONLY}" == true ]]; then
  echo "Checks complete (no pre-warm)."
  exit 0
fi

# 5) Pre-warm the npx cache for the Vision server (efficiency).
echo "Pre-warming @z_ai/mcp-server@latest into the npx cache ..."
if npx -y @z_ai/mcp-server@latest --help >/dev/null 2>&1; then
  ok "package fetched"
else
  # --help may not be supported; a non-zero exit here usually still means the
  # package downloaded. Report without failing the whole script.
  echo "  [warn] pre-warm command returned non-zero (package likely still cached)"
fi

echo "Done. Enable the servers per docs/mcp-server/ZAI_VISION_WEB_READER.md"
