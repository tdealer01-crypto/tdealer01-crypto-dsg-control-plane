#!/bin/bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$REPO_ROOT"
echo "Installing z3-solver..."
pip install z3-solver --quiet
echo "Running Z3 formal verification..."
python3 lib/gateway/z3/generate_spec.py
