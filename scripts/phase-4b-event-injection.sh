#!/bin/bash

# PostHog API configuration
POSTHOG_API_URL="https://us.posthog.com"
PROJECT_ID="479488"
API_KEY="phc_rrWstRCuS38c4P5paRaSgzYa7HnVhY3XWkXMxmPDSEg6"

# Generate test user ID
USER_ID="test-user-$(date +%s)"
ORG_ID="test-org-$(date +%s)"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

echo "📝 Injecting Phase 4B test events into PostHog..."
echo "   User ID: $USER_ID"
echo "   Org ID: $ORG_ID"
echo ""

# Function to capture event
capture_event() {
  local event_name=$1
  local properties=$2
  
  local payload="{
    \"api_key\": \"$API_KEY\",
    \"distinct_id\": \"$USER_ID\",
    \"event\": \"$event_name\",
    \"properties\": {
      \"organization_id\": \"$ORG_ID\",
      $properties
    },
    \"timestamp\": \"$TIMESTAMP\"
  }"
  
  curl -s -X POST "$POSTHOG_API_URL/capture/" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null
  
  echo "✓ $event_name"
}

# Phase 1: Conversion Funnel Events
capture_event "organization_created" "\"organization_name\": \"Test Org\""
capture_event "policy_created" "\"policy_id\": \"pol_test_1\", \"policy_name\": \"Test Policy\", \"policy_type\": \"deterministic\""
capture_event "agent_created" "\"agent_id\": \"ag_test_1\", \"agent_name\": \"Test Agent\""
capture_event "execution_submitted" "\"execution_id\": \"exec_test_1\", \"policy_id\": \"pol_test_1\""
capture_event "decision_made" "\"execution_id\": \"exec_test_1\", \"decision\": \"ALLOW\""
capture_event "checkout_started" "\"checkout_session_id\": \"chk_test_1\""
capture_event "subscription_created" "\"subscription_id\": \"sub_test_1\", \"plan\": \"pro\""

# Phase 2: Operational Metrics
capture_event "workspace_created" "\"workspace_id\": \"ws_test_1\", \"workspace_name\": \"Test Workspace\""
capture_event "approval_queue_checked" "\"queue_size\": 1"
capture_event "approval_completed" "\"approval_id\": \"appr_test_1\", \"decision\": \"approved\""
capture_event "execution_completed" "\"execution_id\": \"exec_test_2\", \"status\": \"completed\""
capture_event "approval_requested" "\"execution_id\": \"exec_test_2\", \"requester_id\": \"$USER_ID\""
capture_event "policy_updated" "\"policy_id\": \"pol_test_1\", \"changed_fields\": [\"rules\"]\""
capture_event "policy_archived" "\"policy_id\": \"pol_test_2\""
capture_event "team_member_invited" "\"invitee_email\": \"test@example.com\""

# Phase 3: Compliance & Audit
capture_event "evidence_exported" "\"export_id\": \"exp_test_1\", \"format\": \"json\""
capture_event "audit_trail_queried" "\"query_range_days\": 30"
capture_event "compliance_report_generated" "\"report_id\": \"rep_test_1\", \"period\": \"monthly\""
capture_event "execution_replayed" "\"execution_id\": \"exec_test_1\""
capture_event "proof_verified" "\"proof_id\": \"proof_test_1\", \"status\": \"valid\""

echo ""
echo "✅ Phase 4B test events injected successfully!"
echo "   Total events: 21"
echo "   Wait 10-15 seconds for event batching..."
echo ""
echo "📊 View events in PostHog:"
echo "   https://us.posthog.com/project/$PROJECT_ID/events"
