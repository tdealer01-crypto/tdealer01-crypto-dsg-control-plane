#!/bin/bash
# Delivery Proof Viral Scanner - HTTP-based, works anywhere

PROD="https://tdealer01-crypto-dsg-control-plane.vercel.app"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🔍 DSG Delivery Proof Scan"
echo "Target: $PROD"
echo "Time: $TIMESTAMP"
echo "Commit: $COMMIT"
echo ""

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local method="${4:-GET}"
  
  response=$(curl -s -X "$method" -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
  http_code=$(echo "$response" | tail -1)
  
  if [ "$http_code" = "$expected" ]; then
    echo "✅ $name → HTTP $http_code"
    return 0
  else
    echo "❌ $name → HTTP $http_code (expected $expected)"
    return 1
  fi
}

check_json() {
  local name="$1"
  local url="$2"
  local jq_filter="$3"
  local method="${4:-GET}"
  
  response=$(curl -s -X "$method" "$url" 2>/dev/null)
  http_code=$(curl -s -X "$method" -w "%{http_code}" -o /dev/null "$url" 2>/dev/null || echo "000")
  
  if [ "$http_code" != "200" ]; then
    echo "❌ $name → HTTP $http_code"
    return 1
  fi
  
  value=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null)
  if [ "$value" = "true" ]; then
    echo "✅ $name → $value"
    return 0
  else
    echo "⚠️  $name → $value"
    return 1
  fi
}

PASS=0
FAIL=0

run_check() { "$@"; if [ $? -eq 0 ]; then ((PASS++)); else ((FAIL++)); fi; }

echo "=== Trust Surface ==="
run_check check "Terms" "$PROD/terms" "200"
run_check check "Privacy" "$PROD/privacy" "200"
run_check check "Security" "$PROD/security" "200"
run_check check "Support" "$PROD/support" "200"

echo ""
echo "=== Runtime Baselines ==="
run_check check "Health" "$PROD/api/health" "200"
run_check check_json "Health OK" "$PROD/api/health" ".ok"
run_check check_json "Rate Limiter Configured" "$PROD/api/health" ".rateLimiter.ok"
run_check check "Readiness" "$PROD/api/readiness" "200"
run_check check_json "Readiness OK" "$PROD/api/readiness" ".ok"

echo ""
echo "=== Auth Gates (POST - should be 401/400, not 429) ==="
run_check check "Execute (no auth)" "$PROD/api/execute" "401" "POST"
run_check check "Webhook (no sig)" "$PROD/api/billing/webhook" "400" "POST"

echo ""
echo "=== MCP Endpoints ==="
run_check check "MCP Manifest" "$PROD/api/mcp/manifest" "200"
run_check check "MCP Tools List" "$PROD/api/mcp" "200"

echo ""
echo "=== Pricing ==="
run_check check "Pricing Page" "$PROD/pricing" "200"

echo ""
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 DELIVERY PROOF: PASS"
  echo ""
  echo "Scan verified at: $TIMESTAMP"
  echo "Commit: $COMMIT"
  echo "Production: $PROD"
  exit 0
else
  echo "❌ DELIVERY PROOF: FAIL ($FAIL checks)"
  exit 1
fi
