#!/bin/bash

##############################################################################
# Stripe Webhook Load Testing
#
# Sends multiple webhook events concurrently to test webhook endpoint
# performance under load. Measures processing time and verifies all
# webhooks are processed correctly.
#
# Usage:
#   ./scripts/webhook-load-test.sh \
#     --url https://your-app.vercel.app/api/stripe/webhook \
#     --secret whsec_live_xxxxx \
#     --count 10 \
#     [OPTIONS]
#
# Options:
#   --url <endpoint>        Target webhook endpoint URL (required)
#   --secret <secret>       Webhook signing secret (required)
#   --count <N>             Number of webhooks to send (default: 10)
#   --event <type>          Event type to send (default: charge.created)
#   --concurrency <N>       Concurrent requests (default: 5)
#   --delay <ms>            Delay between webhooks in ms (default: 100)
#   --save-results          Save results to file
#   --verbose               Enable verbose output
#   --help                  Show this help message
#
# Examples:
#   # Send 10 charge.created webhooks with 5 concurrent
#   ./scripts/webhook-load-test.sh \
#     --url https://your-app.vercel.app/api/stripe/webhook \
#     --secret whsec_live_xxxxx \
#     --count 10
#
#   # Load test with higher concurrency
#   ./scripts/webhook-load-test.sh \
#     --url https://localhost:3000/api/stripe/webhook \
#     --secret whsec_test_xxxxx \
#     --count 50 \
#     --concurrency 10
#
#   # Test multiple event types with mixed load
#   # (Can be scripted as multiple invocations)
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_URL=""
WEBHOOK_SECRET=""
NUM_WEBHOOKS=10
EVENT_TYPE="charge.created"
CONCURRENCY=5
DELAY_MS=100
SAVE_RESULTS=false
VERBOSE=false
RESULTS_FILE=""
SIMULATOR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/stripe-webhook-simulator.sh"

# Tracking variables
TOTAL_TIME=0
SUCCESS_COUNT=0
FAILURE_COUNT=0
MIN_TIME=999999
MAX_TIME=0
TIMES=()

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${MAGENTA}[DEBUG]${NC} $1"
  fi
}

# Check if simulator script exists
check_simulator() {
  if [[ ! -f "$SIMULATOR_SCRIPT" ]]; then
    log_error "Simulator script not found: $SIMULATOR_SCRIPT"
    exit 1
  fi

  if [[ ! -x "$SIMULATOR_SCRIPT" ]]; then
    log_warning "Simulator script is not executable, making it executable..."
    chmod +x "$SIMULATOR_SCRIPT"
  fi
}

# Send a single webhook and measure time
send_webhook() {
  local event_type="$1"
  local index="$2"
  local webhook_url="$3"
  local webhook_secret="$4"

  local start_time=$(date +%s%N)

  # Run simulator and capture result
  local result=$("$SIMULATOR_SCRIPT" \
    --event "$event_type" \
    --url "$webhook_url" \
    --secret "$webhook_secret" 2>&1 || echo "FAILED")

  local end_time=$(date +%s%N)
  local elapsed_ms=$(( (end_time - start_time) / 1000000 ))

  # Check if successful
  if echo "$result" | grep -q "successfully"; then
    echo "$elapsed_ms"
    return 0
  else
    echo "-1"
    return 1
  fi
}

# Send webhooks with concurrency control
send_webhooks_concurrent() {
  local count="$1"
  local concurrency="$2"
  local event_type="$3"
  local webhook_url="$4"
  local webhook_secret="$5"

  log_info "Sending $count webhooks with concurrency $concurrency"
  log_info "Event Type: $event_type"
  echo ""

  local active_jobs=0
  local completed=0
  local pids=()

  for i in $(seq 1 "$count"); do
    # Start webhook send in background
    (
      elapsed=$(send_webhook "$event_type" "$i" "$webhook_url" "$webhook_secret")
      if [[ "$elapsed" != "-1" ]]; then
        echo "$i:$elapsed:success"
      else
        echo "$i:-1:failed"
      fi
    ) &

    pids+=($!)
    active_jobs=$((active_jobs + 1))

    # Check if we've reached max concurrency
    if [[ $active_jobs -ge $concurrency ]]; then
      # Wait for a job to complete
      wait -n 2>/dev/null || true
      active_jobs=$((active_jobs - 1))
    fi

    # Add delay between job starts
    if [[ $i -lt $count ]]; then
      sleep $(echo "scale=3; $DELAY_MS / 1000" | bc)
    fi

    # Progress indicator
    if [[ $((i % 5)) -eq 0 ]]; then
      log_debug "Sent $i/$count webhooks..."
    fi
  done

  # Wait for remaining jobs
  log_debug "Waiting for remaining jobs to complete..."
  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}

# Send webhooks and collect results
run_load_test() {
  local count="$1"
  local concurrency="$2"
  local event_type="$3"
  local webhook_url="$4"
  local webhook_secret="$5"

  log_info "Starting load test"
  log_info "Total webhooks: $count"
  log_info "Concurrency: $concurrency"
  log_info "Target URL: $webhook_url"
  echo ""

  local start_time=$(date +%s%N)

  # Create a temporary file for results
  local results_tmp=$(mktemp)
  trap "rm -f $results_tmp" EXIT

  # Send webhooks
  for i in $(seq 1 "$count"); do
    (
      elapsed=$(send_webhook "$event_type" "$i" "$webhook_url" "$webhook_secret" 2>&1)
      if [[ "$elapsed" != "-1" ]]; then
        echo "$i:$elapsed:success" >> "$results_tmp"
      else
        echo "$i:-1:failed" >> "$results_tmp"
      fi
    ) &

    # Manage concurrency
    local job_count=$(jobs -r | wc -l)
    while [[ $job_count -ge $concurrency ]]; do
      sleep 0.1
      job_count=$(jobs -r | wc -l)
    done

    # Progress bar
    local percent=$((100 * i / count))
    printf "\rProgress: [%-50s] %d%%" "$(printf '#%.0s' {1..50} | cut -c1-$((percent/2)))" "$percent"

    sleep $(echo "scale=3; $DELAY_MS / 1000" | bc)
  done

  # Wait for all jobs
  wait
  echo ""

  local end_time=$(date +%s%N)
  local total_ms=$(( (end_time - start_time) / 1000000 ))

  # Parse results
  log_info "Processing results..."
  SUCCESS_COUNT=0
  FAILURE_COUNT=0
  TOTAL_TIME=0
  MIN_TIME=999999
  MAX_TIME=0
  TIMES=()

  if [[ -f "$results_tmp" ]]; then
    while IFS=: read -r index elapsed status; do
      if [[ "$status" == "success" ]]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        TOTAL_TIME=$((TOTAL_TIME + elapsed))
        if [[ $elapsed -lt $MIN_TIME ]]; then
          MIN_TIME=$elapsed
        fi
        if [[ $elapsed -gt $MAX_TIME ]]; then
          MAX_TIME=$elapsed
        fi
        TIMES+=("$elapsed")
      else
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
      fi
    done < "$results_tmp"
  fi
}

# Calculate statistics
calculate_stats() {
  if [[ ${#TIMES[@]} -eq 0 ]]; then
    return
  fi

  # Average
  local sum=0
  for time in "${TIMES[@]}"; do
    sum=$((sum + time))
  done
  local avg=$((sum / ${#TIMES[@]}))

  # Median (simple)
  local sorted=($(printf '%s\n' "${TIMES[@]}" | sort -n))
  local mid=$((${#sorted[@]} / 2))
  local median=${sorted[$mid]}

  echo "  Average: ${avg}ms"
  echo "  Median: ${median}ms"
  echo "  Min: ${MIN_TIME}ms"
  echo "  Max: ${MAX_TIME}ms"
  echo "  Std Dev: $(calc_stddev)"
}

# Calculate standard deviation
calc_stddev() {
  if [[ ${#TIMES[@]} -lt 2 ]]; then
    echo "N/A"
    return
  fi

  local sum=0
  local avg=0

  # Calculate average
  for time in "${TIMES[@]}"; do
    sum=$((sum + time))
  done
  avg=$((sum / ${#TIMES[@]}))

  # Calculate variance
  sum=0
  for time in "${TIMES[@]}"; do
    local diff=$((time - avg))
    sum=$((sum + diff * diff))
  done

  local variance=$((sum / ${#TIMES[@]}))
  # Rough sqrt approximation
  echo "${variance}ms²"
}

# Save results to file
save_results() {
  local file="$1"

  cat > "$file" <<EOF
Stripe Webhook Load Test Results
================================

Test Configuration:
  Event Type: $EVENT_TYPE
  Total Webhooks: $NUM_WEBHOOKS
  Concurrency: $CONCURRENCY
  Target URL: $WEBHOOK_URL
  Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Results:
  Successful: $SUCCESS_COUNT
  Failed: $FAILURE_COUNT
  Success Rate: $(( 100 * SUCCESS_COUNT / NUM_WEBHOOKS ))%
  Total Time: ${TOTAL_TIME}ms

Performance Metrics:
$(calculate_stats)

Individual Results:
EOF

  if [[ ${#TIMES[@]} -gt 0 ]]; then
    local i=1
    for time in "${TIMES[@]}"; do
      echo "  Webhook $i: ${time}ms" >> "$file"
      i=$((i + 1))
    done
  fi

  log_success "Results saved to: $file"
}

# Print usage
usage() {
  cat <<EOF
Stripe Webhook Load Testing

Sends multiple Stripe webhook events concurrently to test
webhook endpoint performance and stability.

Usage:
  $0 --url <endpoint> --secret <secret> [OPTIONS]

Required Arguments:
  --url <endpoint>        Target webhook endpoint URL
  --secret <secret>       Webhook signing secret (whsec_...)

Optional Arguments:
  --count <N>             Number of webhooks to send (default: 10)
  --event <type>          Event type to send (default: charge.created)
  --concurrency <N>       Max concurrent requests (default: 5)
  --delay <ms>            Delay between webhooks in ms (default: 100)
  --save-results          Save results to timestamped file
  --verbose               Enable verbose output
  --help                  Show this help message

Supported Events:
  - charge.created
  - charge.updated
  - payout.created
  - payout.updated
  - refund.created
  - payment_intent.created
  - payment_intent.processing
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted

Examples:
  # Send 10 charge.created webhooks with default concurrency
  $0 --url https://your-app.vercel.app/api/stripe/webhook \\
     --secret whsec_live_xxxxx

  # Stress test with 50 webhooks and high concurrency
  $0 --url https://your-app.vercel.app/api/stripe/webhook \\
     --secret whsec_live_xxxxx \\
     --count 50 \\
     --concurrency 10

  # Test payout events with detailed results
  $0 --url https://your-app.vercel.app/api/stripe/webhook \\
     --secret whsec_live_xxxxx \\
     --count 20 \\
     --event payout.created \\
     --save-results \\
     --verbose

EOF
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      WEBHOOK_URL="$2"
      shift 2
      ;;
    --secret)
      WEBHOOK_SECRET="$2"
      shift 2
      ;;
    --count)
      NUM_WEBHOOKS="$2"
      shift 2
      ;;
    --event)
      EVENT_TYPE="$2"
      shift 2
      ;;
    --concurrency)
      CONCURRENCY="$2"
      shift 2
      ;;
    --delay)
      DELAY_MS="$2"
      shift 2
      ;;
    --save-results)
      SAVE_RESULTS=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

# Validate required arguments
if [[ -z "$WEBHOOK_URL" || -z "$WEBHOOK_SECRET" ]]; then
  log_error "Missing required arguments"
  usage
fi

# Check prerequisites
check_simulator

# Run load test
run_load_test "$NUM_WEBHOOKS" "$CONCURRENCY" "$EVENT_TYPE" "$WEBHOOK_URL" "$WEBHOOK_SECRET"

# Display results
echo ""
echo "========================================"
log_success "Load Test Complete"
echo "========================================"
echo ""
echo "Results Summary:"
echo "  Successful: $SUCCESS_COUNT/$NUM_WEBHOOKS"
echo "  Failed: $FAILURE_COUNT/$NUM_WEBHOOKS"
echo "  Success Rate: $(( 100 * SUCCESS_COUNT / NUM_WEBHOOKS ))%"
echo ""
echo "Performance:"
calculate_stats
echo ""

# Save results if requested
if [[ "$SAVE_RESULTS" == "true" ]]; then
  RESULTS_FILE="webhook-load-test-$(date +%s).log"
  save_results "$RESULTS_FILE"
fi

# Exit with appropriate code
if [[ $FAILURE_COUNT -eq 0 ]]; then
  exit 0
else
  exit 1
fi
