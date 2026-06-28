#!/bin/bash
set -euo pipefail

# Z3 Solver API Test Suite
# Tests the Z3 Solver endpoint with SMT-LIB v2 formulas

echo "🧪 Z3 Solver API Test Suite"
echo "=============================="

SOLVER_URL="${1:-http://localhost:3000/api/solve}"
PASS=0
FAIL=0

test_case() {
  local name="$1"
  local smt2="$2"
  local expect_sat="$3"

  echo -n "Test: $name ... "

  # Escape quotes and backslashes for JSON
  local escaped_smt2
  escaped_smt2=$(printf '%s\n' "$smt2" | sed 's/\\/\\\\/g; s/"/\\"/g')

  local payload="{\"smt2\": \"${escaped_smt2}\", \"timeout_ms\": 5000}"

  local response
  response=$(curl -s -X POST "$SOLVER_URL" \
    -H "Content-Type: application/json" \
    -d "$payload") || true

  local satisfiable
  satisfiable=$(echo "$response" | grep -o '"satisfiable":[^,}]*' | cut -d: -f2 || echo "")

  if [ "$satisfiable" = "$expect_sat" ]; then
    echo "✅ PASS"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL"
    echo "  Expected: $expect_sat"
    echo "  Got: $satisfiable"
    echo "  Response: $response"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Running tests against: $SOLVER_URL"
echo ""

# Test 1: Simple SAT
test_case "Simple SAT" "(set-logic QF_LIA) (declare-fun x () Int) (assert (> x 5)) (check-sat)" "true"

# Test 2: Simple UNSAT
test_case "Simple UNSAT" "(set-logic QF_LIA) (declare-fun x () Int) (assert (> x 5)) (assert (<= x 5)) (check-sat)" "false"

# Test 3: Boolean formula SAT
test_case "Boolean SAT" "(set-logic QF_UF) (declare-fun p () Bool) (assert p) (check-sat)" "true"

# Test 4: Boolean formula UNSAT
test_case "Boolean UNSAT" "(set-logic QF_UF) (declare-fun p () Bool) (assert p) (assert (not p)) (check-sat)" "false"

# Test 5: Complex arithmetic SAT
test_case "Arithmetic SAT" "(set-logic QF_LIA) (declare-fun x () Int) (declare-fun y () Int) (assert (= (+ x y) 10)) (assert (> x 0)) (check-sat)" "true"

echo ""
echo "=============================="
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
