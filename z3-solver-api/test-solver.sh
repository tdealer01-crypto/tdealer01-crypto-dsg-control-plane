#!/bin/bash

# Z3 Solver API Test Suite

echo "🧪 Z3 Solver API Test Suite"
echo "=============================="

SOLVER_URL="${1:-http://localhost:3000/api/solve}"
PASS=0
FAIL=0

test_case() {
  local name=$1
  local formula=$2
  local expect_sat=$3

  echo -n "Test: $name ... "

  response=$(curl -s -X POST "$SOLVER_URL" \
    -H "Content-Type: application/json" \
    -d "{\"formula\": \"$formula\", \"timeout\": 5000}")

  satisfiable=$(echo "$response" | grep -o '"satisfiable":[^,}]*' | cut -d: -f2)

  if [[ "$satisfiable" == "$expect_sat" ]]; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL"
    echo "  Expected: $expect_sat"
    echo "  Got: $satisfiable"
    echo "  Response: $response"
    ((FAIL++))
  fi
}

echo ""
echo "Running tests against: $SOLVER_URL"
echo ""

# Test 1: Simple SAT
test_case "Simple SAT" "(declare-fun x () Int) (assert (> x 5))" "true"

# Test 2: Simple UNSAT
test_case "Simple UNSAT" "(declare-fun x () Int) (assert (> x 5)) (assert (<= x 5))" "false"

# Test 3: Boolean formula SAT
test_case "Boolean SAT" "(declare-fun p () Bool) (assert p)" "true"

# Test 4: Boolean formula UNSAT
test_case "Boolean UNSAT" "(declare-fun p () Bool) (assert p) (assert (not p))" "false"

# Test 5: Complex arithmetic SAT
test_case "Arithmetic SAT" "(declare-fun x () Int) (declare-fun y () Int) (assert (= (+ x y) 10)) (assert (> x 0))" "true"

echo ""
echo "=============================="
echo "Results: $PASS passed, $FAIL failed"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
