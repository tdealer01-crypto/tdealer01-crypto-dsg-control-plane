# Anomaly Detection System — DSG ONE

**Enterprise Real-Time Anomaly Detection & Alerting Platform**

Real-time anomaly detection system that monitors audit logs and memory events to identify behavioral deviations, pattern anomalies, and frequency spikes, with intelligent alert routing and subscription management.

## Overview

The Anomaly Detection system processes event streams to answer: **"Is this normal behavior, and who should be notified?"**

Anomaly Detection integrates with the DSG RCA system (Phase 2) to:

- **Pattern Matching** — Compare current events against learned historical patterns
- **Behavioral Analysis** — Detect frequency spikes and temporal deviations
- **Similarity Scoring** — Calculate how closely events match known patterns
- **Severity Assessment** — Map detection confidence to low/medium/high/critical levels
- **Alert Routing** — Route alerts through configured channels (email, webhook, Slack, PagerDuty)
- **Subscription Management** — Filter alerts by anomaly type, severity, and similarity threshold

## Architecture

```
Event Stream (Audit Logs + Memory Events)
  ↓
Anomaly Detection Engine
  ├─ Pattern Matcher
  │   ├─ Extract event types from stream
  │   ├─ Match against learned patterns
  │   ├─ Calculate trigger match ratio
  │   └─ Calculate temporal deviation
  │
  ├─ Behavioral Analyzer
  │   ├─ Bucket events by hourly intervals
  │   ├─ Detect frequency spikes (>50% increase)
  │   └─ Calculate deviation score
  │
  └─ Severity Calculator
      ├─ Map similarity score to severity
      ├─ Map deviation score to severity
      └─ Return highest severity (low/medium/high/critical)
    ↓
Alert Orchestrator
  ├─ Filter anomalies by subscription criteria
  │   ├─ Anomaly type match
  │   ├─ Severity level match
  │   └─ Similarity threshold check
  │
  └─ Generate alerts
      ├─ Match subscriptions
      ├─ Extract alert channels
      └─ Prepare recipients
    ↓
Store Results
  ├─ dsg_anomalies (detected anomalies)
  ├─ dsg_anomaly_alerts (alert notifications)
  └─ dsg_anomaly_subscriptions (subscription configs)
    ↓
Response
  ├─ Anomalies detected (count & details)
  ├─ Alerts generated (count & channels)
  └─ Detection method (hybrid_pattern_behavioral)
```

## Database Schema

### dsg_anomalies
Stores detected anomalies with full detection context.

```sql
id UUID PRIMARY KEY
org_id UUID (foreign key to auth.users)
workspace_id UUID
detected_at TIMESTAMPTZ
detection_method TEXT (hybrid_pattern_behavioral)
anomaly_type TEXT (pattern_deviation, pattern_match, frequency_spike)
matched_pattern_id UUID (optional, links to dsg_rca_patterns)
similarity_score DECIMAL(3,2) (0-1)
deviation_score DECIMAL(3,2) (0-1)
incident_summary TEXT (optional)
affected_services TEXT[] (optional)
severity_level TEXT (low/medium/high/critical)
status TEXT (active/investigating/resolved/dismissed)
detection_evidence JSONB (array of evidence objects)
similar_incidents TEXT[] (optional)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Indexes:**
- `idx_dsg_anomalies_org_created` — Query by org + recency
- `idx_dsg_anomalies_workspace_status` — Query by workspace + status
- `idx_dsg_anomalies_similarity` — Query by detection confidence
- `idx_dsg_anomalies_severity` — Query by severity level

**Row-Level Security:**
- SELECT: `org_id = auth.uid()`
- INSERT: `org_id = auth.uid()`
- UPDATE: `org_id = auth.uid()`

### dsg_anomaly_alerts
Tracks alert notifications and delivery status.

```sql
id UUID PRIMARY KEY
org_id UUID (foreign key to auth.users)
workspace_id UUID
anomaly_id UUID (foreign key to dsg_anomalies)
alert_type TEXT (anomaly_detected, pattern_detected, frequency_spike)
channel TEXT (email/webhook/slack/pagerduty)
recipient_id UUID (optional)
recipient_email TEXT (optional)
status TEXT (pending/sent/delivered/failed/acknowledged)
sent_at TIMESTAMPTZ (optional)
delivered_at TIMESTAMPTZ (optional)
acknowledged_at TIMESTAMPTZ (optional)
acknowledged_by UUID (optional)
acknowledgment_note TEXT (optional)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Indexes:**
- `idx_dsg_anomaly_alerts_anomaly` — Query alerts by anomaly
- `idx_dsg_anomaly_alerts_org_status` — Query alerts by org + status

**Row-Level Security:**
- SELECT: `org_id = auth.uid()`
- INSERT: `org_id = auth.uid()`
- UPDATE: `org_id = auth.uid()`

### dsg_anomaly_subscriptions
Configuration for alert subscriptions and routing.

```sql
id UUID PRIMARY KEY
org_id UUID (foreign key to auth.users)
workspace_id UUID
name TEXT (subscription name)
description TEXT (optional)
anomaly_types TEXT[] (optional, empty = all types)
min_similarity_score DECIMAL(3,2) (default 0.7)
severity_levels TEXT[] (default ['high', 'critical'])
alert_channels TEXT[] (email/webhook/slack/pagerduty)
recipients JSONB ({email: ..., slack: ..., etc})
auto_investigate BOOLEAN (default false)
auto_resolve_threshold DECIMAL(3,2) (optional)
is_active BOOLEAN (default true)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Indexes:**
- `idx_dsg_anomaly_subscriptions_org_active` — Query by org + status

**Row-Level Security:**
- SELECT: `org_id = auth.uid()`
- INSERT: `org_id = auth.uid()`
- UPDATE: `org_id = auth.uid()`
- DELETE: `org_id = auth.uid()`

## Core Components

### AnomalyDetector (lib/dsg/anomaly/anomaly-detector.ts)

Pattern-based and behavioral anomaly detection engine.

**Key Methods:**

```typescript
detectAnomalies(events: AnomalyEvent[], threshold: number = 0.7): AnomalyDetectionResult[]
```

Detects pattern-based and behavioral anomalies:
1. **Pattern Matching**: For each learned pattern, calculates:
   - Trigger match ratio (matched triggers / total triggers)
   - Similarity score = trigger match ratio × pattern confidence
   - Temporal deviation (if pattern.averageInterval exists)
   - Evidence collection

2. **Behavioral Anomaly**: Detects frequency spikes:
   - Buckets events hourly
   - Calculates average event count per hour
   - Detects spike > 50% above average
   - Returns frequency_spike anomaly if triggered

3. **Result Filtering**: Returns anomalies with similarity/deviation ≥ threshold

**Returns:** Array of `AnomalyDetectionResult` objects containing:
- `isAnomaly` — Whether result is anomalous or normal
- `anomalyType` — "pattern_match", "pattern_deviation", or "frequency_spike"
- `similarityScore` — Pattern match confidence (0-1)
- `deviationScore` — Temporal or frequency deviation (0-1)
- `matchedPatternId` — UUID of matched pattern (if applicable)
- `evidence` — Array of evidence objects with type, description, confidence, details
- `severity` — "low", "medium", "high", or "critical"
- `hash` — SHA256 hash of result for replay/verification

### AnomalyOrchestrator (lib/dsg/anomaly/anomaly-orchestrator.ts)

Coordinates detection and alert generation.

**Key Methods:**

```typescript
async detectAndAlert(input: DetectionInput): Promise<DetectionOutput>
```

Orchestrates detection and alert routing:
1. **Add Patterns**: Loads learned patterns into detector
2. **Detect Anomalies**: Runs detector with minimum similarity threshold
3. **Filter by Subscriptions**: Applies subscription criteria to matched anomalies
   - Anomaly type match (empty = all)
   - Severity level match
   - Similarity threshold match
   - Subscription active status

4. **Generate Alerts**: Creates alert objects for matched anomalies with:
   - Anomaly ID
   - Subscription ID
   - Alert channels (email, webhook, Slack, PagerDuty)
   - Recipients configuration

5. **Return Results**: Combined detection and alert output

**Input Types:**
```typescript
interface DetectionInput {
  workspaceId: string
  orgId: string
  events: AnomalyEvent[]
  patterns: LearnedPattern[]
  subscriptions: AnomalySubscription[]
}
```

**Output Types:**
```typescript
interface DetectionOutput {
  orgId: string
  workspaceId: string
  anomalies: Array<{
    id: string
    type: string
    severity: string
    similarity: number
    deviation: number
    patternId?: string
    evidence: Record<string, unknown>[]
  }>
  alerts: Array<{
    anomalyId: string
    subscriptionId: string
    channels: string[]
    recipients: Record<string, unknown>
  }>
  detectionMethod: "hybrid_pattern_behavioral"
  timestamp: Date
}
```

## API Routes

### POST /api/dsg/v1/anomaly/detect

Detect anomalies in current event stream.

**Request:**
```json
{
  "workspace_id": "uuid",
  "org_id": "uuid",
  "time_window_minutes": 60,           // optional, default 60
  "similarity_threshold": 0.7          // optional, default 0.7
}
```

**Response:**
```json
{
  "detection_method": "hybrid_pattern_behavioral",
  "timestamp": "2026-07-24T10:30:00Z",
  "anomalies_detected": 2,
  "anomalies": [
    {
      "id": "anomaly-1721817000000-0",
      "type": "pattern_deviation",
      "severity": "high",
      "similarity": 0.85,
      "deviation": 0.42,
      "patternId": "pattern-uuid",
      "evidence": [
        {
          "type": "trigger_match",
          "description": "Matched 4/5 triggers",
          "confidence": 0.8,
          "details": {...}
        }
      ]
    }
  ],
  "alerts_generated": 1,
  "alerts": [
    {
      "anomalyId": "anomaly-1721817000000-0",
      "subscriptionId": "sub-uuid",
      "channels": ["email", "slack"],
      "recipients": {"email": "admin@example.com"}
    }
  ],
  "time_window_minutes": 60,
  "similarity_threshold": 0.7
}
```

**Error Responses:**
- `400` — Missing required parameters
- `500` — Database or processing error

### GET /api/dsg/v1/anomaly/alerts

List alerts with filtering and status summary.

**Query Parameters:**
```
org_id=uuid                  // required
workspace_id=uuid            // optional
status=pending|sent|...      // optional
limit=10                     // optional, default 10
```

**Response:**
```json
{
  "count": 5,
  "alerts": [
    {
      "id": "alert-uuid",
      "org_id": "org-uuid",
      "workspace_id": "workspace-uuid",
      "anomaly_id": "anomaly-uuid",
      "alert_type": "anomaly_detected",
      "channel": "email",
      "recipient_email": "admin@example.com",
      "status": "sent",
      "sent_at": "2026-07-24T10:35:00Z",
      "created_at": "2026-07-24T10:30:00Z"
    }
  ],
  "summary": {
    "pending": 2,
    "sent": 2,
    "delivered": 1,
    "failed": 0,
    "acknowledged": 0
  }
}
```

### POST /api/dsg/v1/anomaly/alerts

Create a new alert manually.

**Request:**
```json
{
  "org_id": "uuid",
  "workspace_id": "uuid",
  "anomaly_id": "uuid",
  "channel": "email|webhook|slack|pagerduty",
  "recipient_email": "admin@example.com"
}
```

**Response:**
```json
{
  "id": "alert-uuid",
  "created_at": "2026-07-24T10:30:00Z",
  "status": "pending"
}
```

### GET /api/dsg/v1/anomaly/subscriptions

List alert subscriptions.

**Query Parameters:**
```
org_id=uuid              // required
workspace_id=uuid        // optional
is_active=true|false     // optional
```

**Response:**
```json
{
  "count": 2,
  "subscriptions": [
    {
      "id": "sub-uuid",
      "org_id": "org-uuid",
      "workspace_id": "workspace-uuid",
      "name": "High Severity Alerts",
      "description": "Route high/critical anomalies to on-call team",
      "anomaly_types": null,
      "min_similarity_score": 0.75,
      "severity_levels": ["high", "critical"],
      "alert_channels": ["email", "slack"],
      "recipients": {
        "email": "oncall@example.com",
        "slack": "#incidents"
      },
      "auto_investigate": false,
      "is_active": true,
      "created_at": "2026-07-01T00:00:00Z"
    }
  ]
}
```

### POST /api/dsg/v1/anomaly/subscriptions

Create a new alert subscription.

**Request:**
```json
{
  "org_id": "uuid",
  "workspace_id": "uuid",
  "name": "High Severity Alerts",
  "description": "Alert on high/critical anomalies",
  "anomaly_types": [],                           // optional, empty = all
  "severity_levels": ["high", "critical"],       // optional
  "alert_channels": ["email", "slack"],          // required
  "recipients": {
    "email": "oncall@example.com",
    "slack": "#incidents"
  },
  "auto_investigate": false,                     // optional
  "auto_resolve_threshold": 0.95                 // optional
}
```

**Response:**
```json
{
  "id": "sub-uuid",
  "created_at": "2026-07-24T10:30:00Z",
  "name": "High Severity Alerts",
  "is_active": true
}
```

## MCP Tools (Model Context Protocol Server)

The anomaly detection system is also available through the DSG RCA Analyzer MCP server (`mcp-server/dsg-rca-analyzer.ts`).

### detect_anomalies

Detect anomalies in real-time.

**Input Schema:**
```json
{
  "workspace_id": "string",
  "org_id": "string",
  "time_window_minutes": "number (default 60)",
  "similarity_threshold": "number (default 0.7)"
}
```

**Output:** Detection report with anomalies and alerts.

### subscribe_alerts

Create or update alert subscription.

**Input Schema:**
```json
{
  "org_id": "string",
  "workspace_id": "string",
  "subscription_name": "string",
  "anomaly_types": ["string array"],
  "severity_levels": ["string array (low|medium|high|critical)"],
  "alert_channels": ["string array (email|webhook|slack|pagerduty)"]
}
```

**Output:** Subscription confirmation with ID and status.

### get_anomaly_status

Retrieve anomaly and alert status.

**Input Schema:**
```json
{
  "org_id": "string",
  "workspace_id": "string (optional)",
  "status": "string (optional, active|investigating|resolved|dismissed)",
  "limit": "number (default 10)"
}
```

**Output:** Status report with anomalies and alerts grouped by status.

## Data Flow Example

**Scenario:** High frequency spike detection with alert routing

1. **Event Stream Arrives:**
   ```
   2026-07-24 10:30:00 — policy_evaluation event
   2026-07-24 10:30:05 — policy_evaluation event
   2026-07-24 10:30:10 — policy_evaluation event (3 events in 10s)
   ```

2. **Detection Runs (POST /api/dsg/v1/anomaly/detect):**
   - Fetch last 60 minutes of events
   - Load learned patterns for org
   - Load active subscriptions
   - Run AnomalyDetector
     - Pattern matching: No match (0 patterns triggered)
     - Behavioral analysis: Detect frequency spike in 10:30 hour bucket
       - Average: 1 event/hour
       - Current: 10 events/10min = 60 events/hour
       - Deviation: (60-1)/1 = 5900% (>50% threshold) ✓
       - Severity: "high" (deviation > 1.5)

3. **Alert Orchestration:**
   - Check active subscriptions for workspace
   - Filter by criteria:
     - Type match: subscription has severity_levels=["high", "critical"] ✓
     - Similarity match: 0.7 threshold, anomaly severity="high" ✓
   - Generate alerts:
     - Route to email, Slack channels
     - Set status="pending"

4. **Store Results:**
   - Insert anomaly record in dsg_anomalies
   - Insert alert records in dsg_anomaly_alerts
   - Return combined detection output

## Best Practices

### 1. Time Window Selection
- Use `time_window_minutes` matching your monitoring interval
- Shorter windows (15-30 min) catch rapid spikes
- Longer windows (60-180 min) detect gradual deviations
- Match window to expected event frequency

### 2. Similarity Threshold Tuning
- Start with `similarity_threshold=0.7` (70% confidence)
- Increase to 0.8-0.9 to reduce false positives
- Decrease to 0.5-0.6 to catch early warnings
- Adjust per subscription, not globally

### 3. Subscription Design
- Create subscriptions for different severity levels
- Use anomaly_types to filter noise
- Configure recipients per channel
- Set auto_investigate for medium+ severity

### 4. Alert Fatigue Prevention
- Use high similarity threshold for non-critical alerts
- Filter by severity level (don't alert on "low")
- Implement acknowledgment workflow
- Review and update patterns monthly

### 5. Pattern Learning
- Feed known incidents to RCA system (Phase 2)
- Learned patterns automatically improve detection
- Periodically review detected patterns
- Reinforce high-confidence patterns

## Troubleshooting

### No anomalies detected
1. Check time_window_minutes covers actual events
2. Verify events exist in audit_logs/memory_events tables
3. Lower similarity_threshold to catch weaker matches
4. Verify subscriptions are is_active=true

### Too many false positives
1. Increase similarity_threshold (0.7 → 0.8 or 0.9)
2. Add anomaly_types filter to subscriptions
3. Increase severity_levels threshold
4. Review and update learned patterns

### Alerts not routing
1. Verify subscription is_active=true
2. Check alert_channels configuration
3. Verify recipients object has correct format
4. Review alert status in dsg_anomaly_alerts table

### Detection latency
1. Check database query performance
2. Monitor event volume in time window
3. Reduce time_window_minutes if needed
4. Profile pattern matching performance

## Integration Points

### With Phase 1: Context Discovery
- Uses dsg_audit_logs from AI Agent context
- Uses dsg_memory_events for behavioral data

### With Phase 2: RCA Analysis
- Consumes dsg_rca_patterns for pattern matching
- Both systems share org/workspace scoping
- Anomalies can trigger auto-investigation

### With Supabase RLS
- All queries respect org_id-based row security
- Subscriptions are org/workspace scoped
- Alerts inherit org/workspace visibility

## Performance Considerations

- **Event Processing**: O(n) per pattern + O(n log n) for sorting
- **Pattern Matching**: O(patterns × events)
- **Frequency Analysis**: O(events) with hourly bucketing
- **Database Storage**: ~500 bytes per anomaly, ~200 bytes per alert
- **Typical Query Time**: 100-500ms for 60-min window with 10K events

## Future Enhancements

- Machine learning-based anomaly scoring
- Predictive alerts (detect anomalies before they cause incidents)
- Anomaly clustering (group related anomalies)
- Integration with external alerting systems
- Automated remediation triggers
- Anomaly root cause linking to RCA findings
