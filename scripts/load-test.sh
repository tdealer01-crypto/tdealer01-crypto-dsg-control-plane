#!/bin/bash

set -e

# Phase 3: Load Testing Harness
# Runs k6 load tests against DSG ONE hybrid proof verification

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="${PROJECT_DIR}/test-results"

# Default values
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"
SCENARIO="${1:-dev}"
VUSER_COUNT="${2:-10}"

# Ensure test-results directory exists
mkdir -p "$TEST_RESULTS_DIR"

echo "=== Phase 3: Hybrid Proof Load Test ==="
echo "Scenario: $SCENARIO"
echo "Base URL: $BASE_URL"
echo ""

# Validate API key for production scenarios
if [[ "$SCENARIO" == "production" || "$SCENARIO" == "production-go" ]] && [[ -z "$API_KEY" ]]; then
  echo "ERROR: API_KEY environment variable required for production scenarios"
  echo "Set with: export API_KEY='your-api-key'"
  exit 1
fi

# Select test parameters based on scenario
case "$SCENARIO" in
  dev|development|local)
    echo "Running development load test (quick validation)..."
    VUS=10
    DURATION="30s"
    OUTPUT_FILE="${TEST_RESULTS_DIR}/phase3-dev-$(date +%s).csv"
    ;;
  staging)
    echo "Running staging load test (comprehensive ramp-up)..."
    VUS=50
    DURATION="5m"
    OUTPUT_FILE="${TEST_RESULTS_DIR}/phase3-staging-$(date +%s).csv"
    ;;
  production|production-go)
    echo "Running PRODUCTION GO/NO-GO load test (1000 concurrent agents)..."
    echo "WARNING: This test will hit production systems."
    read -p "Continue? (yes/no): " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
      echo "Aborted."
      exit 0
    fi
    VUS=1000
    DURATION="10m"
    OUTPUT_FILE="${TEST_RESULTS_DIR}/phase3-production-go-$(date +%s).csv"
    ;;
  *)
    echo "Usage: $0 [dev|staging|production|production-go] [vus_count]"
    echo ""
    echo "Scenarios:"
    echo "  dev              Quick development test (10 VUs, 30s)"
    echo "  staging          Comprehensive staging test (50 VUs, 5m)"
    echo "  production       Full production test (1000 VUs, 10m)"
    echo "  production-go    Production GO/NO-GO gate (1000 VUs, 10m)"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL         API base URL (default: http://localhost:3000)"
    echo "  API_KEY          Bearer token (required for production)"
    exit 1
    ;;
esac

# Override VUS if provided
if [[ -n "$VUSER_COUNT" && "$VUSER_COUNT" != "$SCENARIO" ]]; then
  VUS=$VUSER_COUNT
fi

echo "Configuration:"
echo "  Virtual Users: $VUS"
echo "  Duration: $DURATION"
echo "  Output: $OUTPUT_FILE"
echo ""

# Construct k6 command
K6_CMD="k6 run ${PROJECT_DIR}/tests/load/phase2-hybrid-proof-k6.js"
K6_CMD="$K6_CMD -e BASE_URL='$BASE_URL'"
K6_CMD="$K6_CMD -e API_KEY='${API_KEY}'"
K6_CMD="$K6_CMD --out csv=$OUTPUT_FILE"
K6_CMD="$K6_CMD --summary-export=${OUTPUT_FILE%.*}-summary.json"

# Parse duration into k6 stages format
# Note: k6 uses its own stage configuration from the script
if [[ "$SCENARIO" == "dev" || "$SCENARIO" == "development" ]]; then
  # Quick test with simple ramp
  K6_CMD="$K6_CMD --stage 30s:10"
elif [[ "$SCENARIO" == "staging" ]]; then
  # Comprehensive test (handled in script stages)
  :
elif [[ "$SCENARIO" == "production" || "$SCENARIO" == "production-go" ]]; then
  # Full production test (handled in script stages)
  :
fi

echo "Executing: $K6_CMD"
echo ""

# Run k6
eval "$K6_CMD"

# Parse results
echo ""
echo "=== Load Test Complete ==="
echo "Results saved to: $OUTPUT_FILE"

# Try to extract summary if available
SUMMARY_FILE="${OUTPUT_FILE%.*}-summary.json"
if [[ -f "$SUMMARY_FILE" ]]; then
  echo ""
  echo "=== Summary ==="
  if command -v jq &> /dev/null; then
    jq '.metrics | keys[]' "$SUMMARY_FILE" | head -10
  else
    echo "(Install jq to view detailed summary)"
  fi
fi

echo ""
echo "Next steps:"
echo "1. Review full results: cat $OUTPUT_FILE"
echo "2. Analyze metrics: jq . ${SUMMARY_FILE}"
echo "3. For production GO/NO-GO: verify pass criteria in docs/PHASE3_LOAD_TESTING.md"
