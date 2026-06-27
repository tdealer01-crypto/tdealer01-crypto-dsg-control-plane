#!/usr/bin/env bash
set -euo pipefail

# Solana Job Platform — Quick Start
# ใช้สำหรับ setup ทั้งหมดใน 5 นาที

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  Solana Job Platform — Quick Start"
echo "============================================"
echo ""

# 1. Check Node.js
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js not found. Install Node.js 18+ first."
  echo "  https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "[ERROR] Node.js 18+ required (found v${NODE_VERSION})"
  exit 1
fi
echo "[OK] Node.js $(node -v)"

# 2. Install dependencies
echo ""
echo "[STEP] Installing dependencies..."
npm install
echo "[OK] Dependencies installed"

# 3. Create .env if missing
if [ ! -f .env ]; then
  cat > .env << 'ENVEOF'
# Solana Job Platform Configuration
# NOTE: ค่าเหล่านี้เป็น placeholder — ใส่ค่าจริงก่อนใช้งานจริง

# Solana RPC (ใช้ devnet สำหรับทดสอบ)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Agent identity
AGENT_ID=agent-quickstart

# Platform API keys (optional — simulated mode ไม่ต้องใช้)
# GITHUB_TOKEN=
# IMMUNEFI_API_KEY=
# HACKERONE_API_TOKEN=

# DSG Control Plane (optional)
# DSG_API_URL=http://localhost:3000/api
# DSG_API_KEY=
ENVEOF
  echo "[OK] Created .env (edit with your keys)"
else
  echo "[OK] .env already exists"
fi

# 4. Run single cycle
echo ""
echo "============================================"
echo "  Running first agent cycle..."
echo "============================================"
echo ""

npm run dev

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  npm run dev              — Run single cycle"
echo "  npm run agent:loop       — Continuous mode (1hr interval)"
echo "  npm run agent:fast       — Fast mode (10min interval)"
echo ""
echo "Data file: marketplace-data.json"
echo ""
