#!/bin/bash
# DSG HPC Formal Verification Wrapper
# Provides containerized Z3 + CUDA-accelerated policy verification
# Usage: ./scripts/verify-policy-hpc.sh [--local|--docker|--ci] [--output=PATH]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$REPO_ROOT"

# Configuration
MODE="${1:-docker}"  # local, docker, ci
OUTPUT_DIR="${2:-./evidence-output}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROOF_FILE="ccvs-makk8-z3-proof-${TIMESTAMP}.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verify prerequisites based on mode
verify_prerequisites() {
  case "$MODE" in
    local)
      log_info "Checking local Z3 installation..."
      if ! command -v python3 &> /dev/null; then
        log_error "python3 not found"
        exit 1
      fi
      if ! python3 -c "import z3" 2>/dev/null; then
        log_warn "Z3 not installed. Installing z3-solver..."
        pip install z3-solver
      fi
      log_info "Local Z3 verified ✓"
      ;;

    docker)
      log_info "Checking Docker installation..."
      if ! command -v docker &> /dev/null; then
        log_error "Docker not found"
        exit 1
      fi
      if ! docker info &> /dev/null; then
        log_error "Docker daemon not running"
        exit 1
      fi
      log_info "Docker verified ✓"
      ;;

    ci)
      log_info "CI mode - assuming container already built"
      ;;
  esac
}

# Run verification locally (host Python)
run_local_verification() {
  log_info "Running Z3 verification (local mode)..."
  mkdir -p "$OUTPUT_DIR"

  python3 scripts/makk8-z3-proof.py --output "$OUTPUT_DIR/$PROOF_FILE"

  log_info "Verification complete: $OUTPUT_DIR/$PROOF_FILE"
  cat "$OUTPUT_DIR/$PROOF_FILE" | jq '.summary'
}

# Run verification in Docker container
run_docker_verification() {
  log_info "Building HPC verification container..."
  docker build -f Dockerfile.hpc-verification -t dsg-hpc-verification:latest .

  log_info "Running Z3 verification (Docker mode)..."
  mkdir -p "$OUTPUT_DIR"

  docker run --rm \
    -v "$REPO_ROOT:/workspace" \
    -v "$OUTPUT_DIR:/workspace/evidence-output" \
    --gpus all \
    dsg-hpc-verification:latest \
    "cd /workspace && python3 scripts/makk8-z3-proof.py --output /workspace/evidence-output/$PROOF_FILE"

  log_info "Verification complete: $OUTPUT_DIR/$PROOF_FILE"
  cat "$OUTPUT_DIR/$PROOF_FILE" | jq '.summary'
}

# Run in docker-compose for persistent environment
run_compose_verification() {
  log_info "Starting HPC verification via docker-compose..."
  mkdir -p "$OUTPUT_DIR"

  docker-compose -f docker-compose.hpc.yml up -d dsg-hpc-verification

  log_info "Executing verification in container..."
  docker-compose -f docker-compose.hpc.yml exec -T dsg-hpc-verification \
    python3 scripts/makk8-z3-proof.py --output "/workspace/evidence-output/$PROOF_FILE"

  log_info "Verification complete: $OUTPUT_DIR/$PROOF_FILE"
  cat "$OUTPUT_DIR/$PROOF_FILE" | jq '.summary'

  docker-compose -f docker-compose.hpc.yml down
}

# Main execution
main() {
  log_info "DSG HPC Formal Verification (Mode: $MODE)"
  verify_prerequisites

  case "$MODE" in
    local)
      run_local_verification
      ;;
    docker)
      run_docker_verification
      ;;
    compose)
      run_compose_verification
      ;;
    ci)
      # CI mode: assume container is ready, just run Python
      log_info "Running verification in CI container..."
      mkdir -p "$OUTPUT_DIR"
      python3 scripts/makk8-z3-proof.py --output "$OUTPUT_DIR/$PROOF_FILE"
      cat "$OUTPUT_DIR/$PROOF_FILE" | jq '.summary'
      ;;
    *)
      log_error "Unknown mode: $MODE"
      echo "Usage: $0 [--local|--docker|--compose|--ci] [--output=PATH]"
      exit 1
      ;;
  esac

  log_info "✅ Verification succeeded"
}

main "$@"
