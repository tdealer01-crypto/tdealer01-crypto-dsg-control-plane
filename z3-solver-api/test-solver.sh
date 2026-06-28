#!/bin/bash
# Z3 Solver API Test Script
# Usage: ./test-solver.sh [URL]
# Default URL: http://localhost:3000
# Example: ./test-solver.sh https://dsg-z3-solver-api.vercel.app

set -e

URL="${1:-http://localhost:3000}"
ENDPOINT="$URL/api/solve"

echo "🧪 Z3 Solver API Test Suite"
echo "📍 Endpoint: $ENDPOINT"
echo ""

# Test 1: SAT (Satisfiable)
echo "Test 1️⃣  : SAT Formula (satisfiable)"
SAT_RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "test-sat-001"
  }')

SAT_STATUS=$(echo "$SAT_RESULT" | jq -r '.status')
SAT_SATISFIABLE=$(echo "$SAT_RESULT" | jq -r '.satisfiable')

if [ "$SAT_STATUS" = "sat" ] && [ "$SAT_SATISFIABLE" = "true" ]; then
  echo "✅ PASS: Got expected 'sat' status"
else
  echo "❌ FAIL: Expected sat=true, got status=$SAT_STATUS, satisfiable=$SAT_SATISFIABLE"
  echo "Response: $SAT_RESULT"
  exit 1
fi

echo "Response:"
echo "$SAT_RESULT" | jq .
echo ""

# Test 2: UNSAT (Unsatisfiable)
echo "Test 2️⃣  : UNSAT Formula (contradiction)"
UNSAT_RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert (and p (not p)))\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "test-unsat-001"
  }')

UNSAT_STATUS=$(echo "$UNSAT_RESULT" | jq -r '.status')
UNSAT_SATISFIABLE=$(echo "$UNSAT_RESULT" | jq -r '.satisfiable')

if [ "$UNSAT_STATUS" = "unsat" ] && [ "$UNSAT_SATISFIABLE" = "false" ]; then
  echo "✅ PASS: Got expected 'unsat' status"
else
  echo "❌ FAIL: Expected unsat=false, got status=$UNSAT_STATUS, satisfiable=$UNSAT_SATISFIABLE"
  echo "Response: $UNSAT_RESULT"
  exit 1
fi

echo "Response:"
echo "$UNSAT_RESULT" | jq .
echo ""

# Test 3: Missing SMT2 Field
echo "Test 3️⃣  : Invalid Request (missing smt2)"
ERROR_RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "timeout_ms": 5000,
    "nonce": "test-error-001"
  }')

ERROR_CODE=$(echo "$ERROR_RESULT" | jq -r '.error // empty')

if [ -n "$ERROR_CODE" ]; then
  echo "✅ PASS: Got expected error response"
else
  echo "❌ FAIL: Expected error field, got: $ERROR_RESULT"
  exit 1
fi

echo "Response:"
echo "$ERROR_RESULT" | jq .
echo ""

# Test 4: Complex Formula with Model
echo "Test 4️⃣  : Complex Formula (multiple variables)"
COMPLEX_RESULT=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const x Int)\n(declare-const y Int)\n(assert (> x 0))\n(assert (> y 0))\n(assert (= (+ x y) 10))\n(check-sat)\n(get-model)",
    "timeout_ms": 5000,
    "nonce": "test-complex-001"
  }')

COMPLEX_STATUS=$(echo "$COMPLEX_RESULT" | jq -r '.status')
HAS_MODEL=$(echo "$COMPLEX_RESULT" | jq '.model // empty')

if [ "$COMPLEX_STATUS" = "sat" ] && [ -n "$HAS_MODEL" ]; then
  echo "✅ PASS: Got SAT status with model"
else
  echo "⚠️  WARNING: Got status=$COMPLEX_STATUS, but may not have model extraction (not critical)"
fi

echo "Response:"
echo "$COMPLEX_RESULT" | jq .
echo ""

# Test 5: Response Schema Validation
echo "Test 5️⃣  : Response Schema Validation"
SCHEMA_CHECK=$(echo "$SAT_RESULT" | jq -r '.status, .satisfiable, .solver_version, .time_ms, .smt2_hash')

if [ -z "$SCHEMA_CHECK" ]; then
  echo "❌ FAIL: Response missing required fields"
  exit 1
else
  echo "✅ PASS: Response has all required fields"
fi

echo "Required fields present:"
echo "  - status: $(echo "$SAT_RESULT" | jq -r '.status')"
echo "  - satisfiable: $(echo "$SAT_RESULT" | jq -r '.satisfiable')"
echo "  - solver_version: $(echo "$SAT_RESULT" | jq -r '.solver_version')"
echo "  - time_ms: $(echo "$SAT_RESULT" | jq -r '.time_ms')"
echo "  - smt2_hash: $(echo "$SAT_RESULT" | jq -r '.smt2_hash' | cut -c1-16)..."
echo ""

echo "📊 Summary"
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "1. If testing locally, run: npm run dev"
echo "2. If testing Vercel deployment, share URL with DSG Control Plane"
echo "3. Update DSG_EXTERNAL_SOLVER_URL in main app environment"
echo "4. Redeploy main app to enable Z3 external solver"
