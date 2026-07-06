#!/usr/bin/env bash
# Termux DSG All-in-One Setup
# Run on Android Termux: chmod +x termux-dsg-setup.sh && ./termux-dsg-setup.sh
# Complete DSG setup on Android phone in ~10 minutes

set -euo pipefail

echo "📱 Termux DSG All-in-One Setup"
echo "================================"
echo "This will install and configure the complete DSG stack on Android."
echo ""

# Check if running in Termux
if [[ ! -d "/data/data/com.termux" ]]; then
  echo "❌ This script must run in Termux on Android"
  exit 1
fi

# Update packages
echo "📦 Updating Termux packages..."
pkg update -y && pkg upgrade -y

# Install core packages
echo "📦 Installing core packages..."
pkg install -y \
  nodejs-lts \
  git \
  gh \
  supabase \
  postgresql \
  python \
  python-pip \
  openssh \
  curl \
  jq \
  vim \
  tmux \
  termux-api

# Install Node.js global tools
echo "📦 Installing global npm packages..."
npm install -g \
  vercel@latest \
  @modelcontextprotocol/sdk \
  @supabase/supabase-js \
  typescript \
  tsx \
  vitest \
  @types/node

# Setup SSH key for GitHub
echo "🔐 Setting up SSH key for GitHub..."
if [[ ! -f ~/.ssh/id_ed25519 ]]; then
  ssh-keygen -t ed25519 -C "termux-dsg@$(hostname)" -f ~/.ssh/id_ed25519 -N ""
  echo "🔑 Public key (add to GitHub):"
  cat ~/.ssh/id_ed25519.pub
  echo ""
  echo "👉 Add this key to: https://github.com/settings/keys"
  read -p "Press Enter after adding key to GitHub..."
fi

# Configure Git
echo "⚙️ Configuring Git..."
git config --global user.name "Tar"
git config --global user.email "tar@tdealer01.com"
git config --global init.defaultBranch main
git config --global credential.helper store

# Login to services
echo "🔐 Logging into services..."

echo "🔐 GitHub CLI..."
gh auth status >/dev/null 2>&1 || gh auth login -h github.com -p https -w

echo "🔐 Vercel CLI..."
vercel whoami >/dev/null 2>&1 || vercel login

echo "🔐 Supabase CLI..."
supabase projects list >/dev/null 2>&1 || supabase login

# Clone repository
REPO_DIR="$HOME/tdealer01-crypto-dsg-control-plane"
if [[ ! -d "$REPO_DIR" ]]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git "$REPO_DIR"
else
  echo "📦 Repository exists, pulling latest..."
  cd "$REPO_DIR" && git pull origin main
fi

cd "$REPO_DIR"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm ci

# Run setup scripts
echo "🔧 Running Vercel setup..."
chmod +x scripts/vercel-setup.sh
./scripts/vercel-setup.sh

echo "🔧 Running Supabase init..."
chmod +x scripts/supabase-init.sh
./scripts/supabase-init.sh

# Run tests
echo "🧪 Running tests..."
npm run test:integration

# Build
echo "🏗️ Building..."
npm run build

# Deploy
echo "🚀 Deploying to Vercel..."
vercel deploy --prod --force

echo ""
echo "✅ Termux DSG Setup Complete!"
echo "=============================="
echo ""
echo "📱 Your Android is now a DSG development machine!"
echo ""
echo "🔗 Quick Commands:"
echo "  cd ~/tdealer01-crypto-dsg-control-plane"
echo "  npm run test           # Run all tests"
echo "  npm run dev            # Start dev server"
echo "  vercel deploy --prod   # Deploy to production"
echo "  vercel logs --prod     # View production logs"
echo ""
echo "🔗 MCP Server (for Claude/Cursor):"
echo "  node mcp-server/dsg-proofgate.js"
echo ""
echo "🔗 GitHub Actions:"
echo "  Push to main -> Auto deploy + Z3 gate + Security audit"
echo ""
echo "📱 Termux Tips:"
echo "  tmux new -s dsg     # Persistent session"
echo "  termux-wake-lock    # Keep CPU awake"
echo "  termux-battery-status  # Check battery"
echo ""
echo "🎉 DSG Control Plane ready on Android!"
echo "   Production: https://tdealer01-crypto-dsg-control-plane.vercel.app"