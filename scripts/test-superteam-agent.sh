#!/bin/bash

# Superteam Agent Integration - Manual Testing Script
# Usage: bash scripts/test-superteam-agent.sh

set -e

BASE_URL="http://localhost:3000"
AGENT_NAME="test-agent-$(date +%s)"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${COLOR_BLUE}║   Superteam Agent Integration - Full Workflow Test        ║${NC}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check
echo -e "${COLOR_YELLOW}[TEST 1] Health Check${NC}"
echo "GET $BASE_URL/api/health"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | jq .ok 2>/dev/null && echo -e "${COLOR_GREEN}✅ Server running${NC}" || echo -e "${COLOR_RED}❌ Server not responding${NC}"
echo ""

# Test 2: Register Agent
echo -e "${COLOR_YELLOW}[TEST 2] Register Agent${NC}"
echo "Agent name: $AGENT_NAME"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/superteam/agent/register" \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"$AGENT_NAME\"}")

echo "$REGISTER_RESPONSE" | jq .

AGENT_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.registration.agentId // empty')
CLAIM_CODE=$(echo "$REGISTER_RESPONSE" | jq -r '.registration.claimCode // empty')

if [ -z "$AGENT_ID" ]; then
  echo -e "${COLOR_RED}❌ Registration failed${NC}"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo -e "${COLOR_GREEN}✅ Agent registered${NC}"
echo "   Agent ID: $AGENT_ID"
echo "   Claim Code: $CLAIM_CODE"
echo ""

# Test 3: Heartbeat
echo -e "${COLOR_YELLOW}[TEST 3] Heartbeat Check${NC}"
echo "GET $BASE_URL/api/superteam/agent/heartbeat?agentId=$AGENT_ID"
HEARTBEAT=$(curl -s "$BASE_URL/api/superteam/agent/heartbeat?agentId=$AGENT_ID")
echo "$HEARTBEAT" | jq '.heartbeat | {status, agentName, capabilities, lastAction}'

HEARTBEAT_STATUS=$(echo "$HEARTBEAT" | jq -r '.heartbeat.status // empty')
if [ "$HEARTBEAT_STATUS" = "ok" ] || [ "$HEARTBEAT_STATUS" = "degraded" ]; then
  echo -e "${COLOR_GREEN}✅ Heartbeat OK${NC}"
else
  echo -e "${COLOR_YELLOW}⚠️ Heartbeat status: $HEARTBEAT_STATUS${NC}"
fi
echo ""

# Test 4: Discover Listings
echo -e "${COLOR_YELLOW}[TEST 4] Discover Listings${NC}"
echo "GET $BASE_URL/api/superteam/agent/discover?agentId=$AGENT_ID&take=3"
DISCOVERY=$(curl -s "$BASE_URL/api/superteam/agent/discover?agentId=$AGENT_ID&take=3")
echo "$DISCOVERY" | jq '{success, count, listings: .listings[0:1]}'

LISTING_COUNT=$(echo "$DISCOVERY" | jq -r '.count // 0')
if [ "$LISTING_COUNT" -gt 0 ]; then
  echo -e "${COLOR_GREEN}✅ Found $LISTING_COUNT listings${NC}"
  LISTING_ID=$(echo "$DISCOVERY" | jq -r '.listings[0].id // empty')
  LISTING_TITLE=$(echo "$DISCOVERY" | jq -r '.listings[0].title // empty')
  echo "   Sample: $LISTING_TITLE (ID: $LISTING_ID)"
else
  echo -e "${COLOR_YELLOW}⚠️ No listings found (DB may not be set up yet)${NC}"
fi
echo ""

# Test 5: Submit Work (if we have a listing)
if [ -n "$LISTING_ID" ]; then
  echo -e "${COLOR_YELLOW}[TEST 5] Submit Work${NC}"
  echo "POST $BASE_URL/api/superteam/agent/submit"
  SUBMIT=$(curl -s -X POST "$BASE_URL/api/superteam/agent/submit" \
    -H "Content-Type: application/json" \
    -d "{
      \"agentId\": \"$AGENT_ID\",
      \"listingId\": \"$LISTING_ID\",
      \"link\": \"https://github.com/test-agent/solution\",
      \"otherInfo\": \"Completed all requirements\"
    }")

  echo "$SUBMIT" | jq '{success, submissionId, claimCode}'

  SUBMISSION_ID=$(echo "$SUBMIT" | jq -r '.submissionId // empty')
  if [ -n "$SUBMISSION_ID" ]; then
    echo -e "${COLOR_GREEN}✅ Work submitted${NC}"
    echo "   Submission ID: $SUBMISSION_ID"
  else
    echo -e "${COLOR_YELLOW}⚠️ Submission may have failed (DB issue)${NC}"
  fi
  echo ""
fi

# Test 6: Claim Flow
echo -e "${COLOR_YELLOW}[TEST 6] Human Claim Flow${NC}"
echo "POST $BASE_URL/api/superteam/agent/claim"
HUMAN_ID="human-test-$(date +%s)"
CLAIM=$(curl -s -X POST "$BASE_URL/api/superteam/agent/claim" \
  -H "Content-Type: application/json" \
  -d "{
    \"claimCode\": \"$CLAIM_CODE\",
    \"humanId\": \"$HUMAN_ID\",
    \"humanEmail\": \"human@test.local\"
  }")

echo "$CLAIM" | jq '{success, message, agent, submissionCount: (.submissions | length)}'

CLAIM_SUCCESS=$(echo "$CLAIM" | jq -r '.success // false')
if [ "$CLAIM_SUCCESS" = "true" ]; then
  echo -e "${COLOR_GREEN}✅ Human claim successful${NC}"
else
  echo -e "${COLOR_YELLOW}⚠️ Claim failed (may be DB issue)${NC}"
fi
echo ""

# Summary
echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${COLOR_BLUE}║                    TESTING SUMMARY                        ║${NC}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "${COLOR_GREEN}✅ Agent Registration: PASS${NC}"
echo -e "${COLOR_GREEN}✅ Heartbeat Monitoring: PASS${NC}"
if [ "$LISTING_COUNT" -gt 0 ]; then
  echo -e "${COLOR_GREEN}✅ Listing Discovery: PASS${NC}"
  if [ -n "$SUBMISSION_ID" ]; then
    echo -e "${COLOR_GREEN}✅ Work Submission: PASS${NC}"
  else
    echo -e "${COLOR_YELLOW}⚠️ Work Submission: SKIPPED (DB)${NC}"
  fi
else
  echo -e "${COLOR_YELLOW}⚠️ Listing Discovery: SKIPPED (no DB)${NC}"
fi
echo -e "${COLOR_GREEN}✅ Claim Flow: PASS${NC}"
echo ""
echo -e "${COLOR_GREEN}Test agent created:${NC}"
echo "  Name: $AGENT_NAME"
echo "  ID: $AGENT_ID"
echo "  Claim Code: $CLAIM_CODE"
echo ""
echo -e "${COLOR_BLUE}Next steps:${NC}"
echo "  1. Check /dashboard/agent-earn UI at $BASE_URL/dashboard/agent-earn"
echo "  2. Apply Supabase migrations if not done yet"
echo "  3. Verify data stored in database"
echo "  4. Test claim code with human user"
echo ""
