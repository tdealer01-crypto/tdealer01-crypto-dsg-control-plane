#!/usr/bin/env bash
# Install DSG Hybrid Agent Skill
# Run from project root: bash skills/dsg-hybrid-agent/install.sh

set -euo pipefail

SKILL_NAME="dsg-hybrid-agent"
SKILL_DIR="skills/$SKILL_NAME"
PROJECT_ROOT="$(pwd)"

echo "=== Installing DSG Hybrid Agent Skill ==="

# 1. Check prerequisites
echo "Checking prerequisites..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "Error: Run from project root (package.json not found)"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not installed"
    exit 1
fi

# Check npm/yarn/pnpm
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
elif command -v yarn &> /dev/null; then
    PKG_MGR="yarn"
else
    PKG_MGR="npm"
fi

echo "Using package manager: $PKG_MGR"

# 2. Install dependencies
echo "Installing dependencies..."
$PKG_MGR install @browserbasehq/stagehand yaml cheerio --save

# Install dev dependencies for recording
$PKG_MGR install -D playwright tsx --save-dev

# 3. Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install chromium

# 4. Verify ROM DOM files exist
echo "Verifying ROM DOM files..."
ROM_FILES=(
    "src/rom-dom/login.json"
    "src/rom-dom/hermes-dashboard.json"
    "src/rom-dom/landing.json"
    "src/rom-dom/delivery-proof.json"
    "src/rom-dom/readiness-report.json"
    "src/rom-dom/health.json"
    "src/rom-dom/mcp-manifest.json"
    "src/rom-dom/compliance-annex4.json"
    "src/rom-dom/ccvs-status.json"
    "src/rom-dom/gate-evaluate.json"
    "src/rom-dom/registry.ts"
)

for f in "${ROM_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "Warning: $f not found"
    else
        echo "  ✓ $f"
    fi
done

# 5. Verify simulation engine
echo "Verifying simulation engine..."
if [[ -f "src/lib/simulation/engine.ts" && -f "src/lib/simulation/index.ts" && -f "src/lib/simulation/task-registry.ts" ]]; then
    echo "  ✓ Simulation engine files present"
else
    echo "Warning: Simulation engine files missing"
fi

# 6. Verify API route
echo "Verifying Hybrid API route..."
if [[ -f "app/api/agent/hybrid/route.ts" ]]; then
    echo "  ✓ Hybrid API route present"
else
    echo "Warning: Hybrid API route missing"
fi

# 7. Verify task definitions
echo "Verifying task definitions..."
TASK_FILES=(
    "tasks/login-and-gate-eval.yaml"
    "tasks/public-recon.yaml"
    "tasks/delivery-proof-scan.yaml"
    "tasks/readiness-check.yaml"
    "tasks/ci-cd-pipeline.yaml"
)

for f in "${TASK_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
        echo "Warning: $f not found"
    else
        echo "  ✓ $f"
    fi
done

# 8. TypeScript compilation check
echo "Running TypeScript check..."
if $PKG_MGR run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
    echo "  ✓ TypeScript compilation passed"
else
    echo "Warning: TypeScript check had issues (may be expected for new files)"
fi

# 9. Register skill with Hermes (if Hermes CLI available)
if command -v hermes &> /dev/null; then
    echo "Registering skill with Hermes..."
    hermes skill install "$SKILL_DIR" || echo "Hermes skill install skipped (may already be registered)"
else
    echo "Hermes CLI not found - skill not auto-registered"
    echo "To register manually: hermes skill install $SKILL_DIR"
fi

# 10. Create example environment file
echo "Creating example environment file..."
cat > .env.hybrid-agent.example << 'EOF'
# Hybrid Agent Environment Variables
# Copy to .env.local or .env.production

# Required for real browser mode (hybrid/real-only)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Optional: Custom endpoint
# DSG_HYBRID_ENDPOINT=https://your-app.vercel.app/api/agent/hybrid
EOF

echo "  ✓ Created .env.hybrid-agent.example"

# 11. Summary
echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy .env.hybrid-agent.example to .env.local and add Browserbase credentials"
echo "2. Test sim-only mode: curl -X POST http://localhost:3000/api/agent/hybrid -d @tasks/public-recon.yaml"
echo "3. For hybrid mode: configure Browserbase (https://browserbase.com)"
echo "4. Record new ROM DOMs: npx tsx scripts/record-rom.ts <key> <url> [true]"
echo "5. Register with Hermes: hermes skill install $SKILL_DIR"
echo ""
echo "Files created:"
echo "  - src/rom-dom/ (10 ROM DOM snapshots + registry)"
echo "  - src/lib/simulation/ (engine, task-registry)"
echo "  - app/api/agent/hybrid/route.ts (Hybrid API)"
echo "  - tasks/ (5 task definitions)"
echo "  - skills/dsg-hybrid-agent/ (Hermes skill)"
echo ""
echo "Documentation:"
echo "  - skills/dsg-hybrid-agent/SKILL.md"
echo "  - skills/dsg-hybrid-agent/references/recording-guide.md"
echo "  - skills/dsg-hybrid-agent/templates/task-template.md"
echo "  - skills/dsg-hybrid-agent/templates/multi-agent-template.md"