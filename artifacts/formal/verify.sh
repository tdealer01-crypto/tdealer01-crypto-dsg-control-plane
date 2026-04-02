#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROOF_FILE="$ROOT_DIR/artifacts/formal/dsg_gate_proof.smt2"

if ! command -v z3 >/dev/null 2>&1; then
  echo "z3 is not installed. Install Z3 and re-run this script." >&2
  exit 127
fi

z3 "$PROOF_FILE"
