# Automated RCA (Root Cause Analysis) — DSG ONE

**Enterprise Incident Investigation Platform**

Automated Root Cause Analysis (RCA) system that analyzes audit logs and memory events to identify root causes, detect patterns, and generate actionable remediation recommendations.

## Overview

The RCA system processes incident data to answer: **"Why did this incident happen and what do we do about it?"**

RCA integrates with the DSG Context Discovery MCP Server (Phase 1) to:

- **Timeline Analysis** — Reconstruct event sequences and identify causal chains
- **Pattern Matching** — Compare incidents against historical patterns
- **Causal Inference** — Determine which events caused subsequent failures
- **Evidence Collection** — Build supporting evidence chains
- **Recommendation Generation** — Suggest remediation actions

## Architecture

```
Incident Report
  ↓
RCA Analysis Engine
  ├─ Timeline Reconstructor
  │   ├─ Sort events by timestamp
  │   ├─ Build causality links
  │   └─ Find critical path
  │
  ├─ Pattern Analyzer
  │   ├─ Extract triggers from timeline
  │   ├─ Match against known patterns
  │   └─ Score matches by confidence
  │
  └─ Confidence Calculator
      ├─ Timeline path confidence
      ├─ Pattern match score
      └─ Final RCA confidence
    ↓
Store in Database
  ├─ dsg_rca_analyses
  ├─ dsg_rca_evidence_chains
  └─ dsg_rca_patterns
    ↓
Response
  ├─ Root cause (text)
  ├─ Category (configuration, permission, etc.)
  ├─ Confidence score (0-1)
  ├─ Affected services
  ├─ Recommended actions
  └─ Similar past incidents
```

## Data Flow

```
1. Agent/System detects incident
   ↓
2. POST /api/dsg/v1/rca/analyze
   {
     workspace_id: "ws_123",
     org_id: "org_456",
     incident_type: "cost_spike",
     incident_summary: "Production deployment failed, cost limit exceeded",
     incident_start_time: "2026-07-24T10:15:00Z",
     incident_end_time: "2026-07-24T10:45:00Z"
   }
   ↓
3. Fetch audit logs & memory events from time window
   ↓
4. Reconstruct timeline
   ↓
5. Apply analysis (timeline + pattern matching)
   ↓
6. Store result in dsg_rca_analyses
   ↓
7. Return RCA report
```

## Tools

### 1. analyze_incident

Perform automated root cause analysis on an incident.

**Input Parameters:**
- `workspace_id` (required) — Workspace scope
- `org_id` (required) — Organization scope
- `incident_type` (required) — Type of incident:
  - `policy_evaluation`
  - `execution_blocked`
  - `deployment_failed`
  - `cost_spike`
  - `performance_degradation`
  - `access_denied`
  - `data_anomaly`
  - `compliance_violation`
- `incident_summary` (required) — What happened
- `incident_start_time` (required) — When it started (ISO 8601)
- `incident_end_time` (optional) — When it ended (ISO 8601)

**Example:**
```json
{
  "workspace_id": "ws_123",
  "org_id": "org_456",
  "incident_type": "cost_spike",
  "incident_summary": "Unexpected cost increase during deployment",
  "incident_start_time": "2026-07-24T10:15:00Z",
  "incident_end_time": "2026-07-24T10:45:00Z"
}
```

**Response:**
```
Root Cause: Unoptimized database query in deployment v2.1.0
Category: resource_limit
Confidence: 87%

Affected Services:
- API: POST /api/execute
- Database: queries_table

Recommended Actions:
- Optimize database query (add index on timestamp)
- Review query performance in staging
- Set cost alerts at 70% threshold
- Implement query caching

Evidence: 12 audit events, 8 memory events
Similar Incidents: 3 in last 90 days
```

### 2. get_incident_patterns

Retrieve learned patterns from past incidents.

**Input Parameters:**
- `org_id` (required) — Organization ID
- `root_cause_category` (optional) — Filter by category
- `min_confidence` (optional) — Minimum confidence (0-1, default: 0.7)

**Example:**
```json
{
  "org_id": "org_456",
  "root_cause_category": "resource_limit",
  "min_confidence": 0.75
}
```

**Response:**
```
Found 3 patterns:

[92%] Cost Limit Exceeded
  Root Cause: Unoptimized query or excessive resource consumption
  Occurrences: 12
  Remediation:
  - Optimize database queries
  - Add caching layer
  - Review resource allocation

[87%] Permission Denied
  Root Cause: Insufficient permissions or role configuration
  Occurrences: 8

[82%] Data Quality Issue
  Root Cause: Invalid or malformed data in request/database
  Occurrences: 9
```

### 3. compare_incidents

Compare current incident with similar past incidents.

**Input Parameters:**
- `org_id` (required) — Organization ID
- `root_cause_category` (optional) — Category to compare against
- `incident_summary` (optional) — Summary of current incident
- `days_back` (optional) — Search window (default: 90)
- `limit` (optional) — Max results (default: 5)

**Example:**
```json
{
  "org_id": "org_456",
  "root_cause_category": "resource_limit",
  "days_back": 30,
  "limit": 5
}
```

**Response:**
```
Found 3 similar incidents:

[89%] Cost spike detected (2026-07-20)
  Root Cause: Unoptimized query with N+1 problem
  Resolution: Added query cache, cost decreased by 60%

[87%] Performance degradation (2026-07-15)
  Root Cause: Memory leak in batch processor
  Resolution: Implemented proper cleanup in finalizers

[75%] API timeout (2026-07-10)
  Root Cause: Database connection pool exhausted
  Resolution: Increased pool size from 10 to 50
```

## Database Schema

### dsg_rca_analyses

Main RCA result storage.

```sql
CREATE TABLE dsg_rca_analyses (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  
  -- Incident
  incident_type TEXT,
  incident_summary TEXT,
  incident_start_time TIMESTAMPTZ,
  incident_end_time TIMESTAMPTZ,
  
  -- Analysis Results
  root_cause TEXT,
  root_cause_category TEXT,
  confidence_score DECIMAL(3,2),
  analysis_method TEXT,
  
  -- Metadata
  affected_services TEXT[],
  similar_past_incidents INT,
  evidence_count INT,
  recommended_action TEXT,
  severity_level TEXT,
  
  -- Timestamps
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### dsg_rca_evidence_chains

Detailed causal evidence links.

```sql
CREATE TABLE dsg_rca_evidence_chains (
  id UUID PRIMARY KEY,
  rca_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Chain
  chain_index INT,
  chain_step TEXT,
  
  -- Evidence
  evidence_type TEXT,
  evidence_source_id UUID,
  evidence_text TEXT,
  event_time TIMESTAMPTZ,
  
  -- Causality
  caused_by_ids UUID[],
  confidence DECIMAL(3,2),
  
  created_at TIMESTAMPTZ
);
```

### dsg_rca_patterns

Learned patterns from historical RCA results.

```sql
CREATE TABLE dsg_rca_patterns (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  
  -- Pattern
  pattern_name TEXT,
  pattern_description TEXT,
  trigger_type TEXT,
  trigger_condition JSONB,
  
  -- Learning
  typical_root_cause TEXT,
  root_cause_category TEXT,
  remediation_steps TEXT[],
  
  -- Frequency
  occurrence_count INT,
  success_rate DECIMAL(3,2),
  confidence DECIMAL(3,2),
  
  -- Lifecycle
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## REST API

### POST /api/dsg/v1/rca/analyze

Trigger RCA analysis on an incident.

**Request:**
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/rca/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "ws_123",
    "org_id": "org_456",
    "incident_type": "cost_spike",
    "incident_summary": "Unexpected cost increase",
    "incident_start_time": "2026-07-24T10:15:00Z",
    "incident_end_time": "2026-07-24T10:45:00Z"
  }'
```

**Response:**
```json
{
  "id": "rca-1721814900000-a1b2c3d",
  "root_cause": "Unoptimized database query in v2.1.0",
  "root_cause_category": "resource_limit",
  "confidence_score": 0.87,
  "analysis_method": "hybrid",
  "affected_services": ["API: POST /api/execute", "Database"],
  "recommended_actions": [
    "Optimize database query",
    "Review query performance in staging",
    "Set cost alerts at 70%"
  ],
  "evidence_count": 20,
  "similar_past_incidents": 3
}
```

### GET /api/dsg/v1/rca/reports

List RCA reports for an organization.

**Query Parameters:**
- `org_id` (required)
- `workspace_id` (optional)
- `days_back` (optional, default: 30)
- `limit` (optional, default: 10)

**Request:**
```bash
curl "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/rca/reports?org_id=org_456&days_back=7&limit=5"
```

**Response:**
```json
{
  "count": 3,
  "reports": [
    {
      "id": "rca-123",
      "incident_type": "cost_spike",
      "root_cause": "Unoptimized query",
      "confidence_score": 0.87,
      "severity_level": "high",
      "created_at": "2026-07-24T10:45:00Z"
    }
  ]
}
```

### GET /api/dsg/v1/rca/patterns

List learned patterns.

**Query Parameters:**
- `org_id` (required)
- `root_cause_category` (optional)
- `min_confidence` (optional, default: 0.7)

**Request:**
```bash
curl "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/rca/patterns?org_id=org_456&min_confidence=0.8"
```

## Analysis Methods

### 1. Timeline Analysis

Reconstructs the sequence of events leading to the incident.

**Process:**
1. Fetch all audit logs and memory events in time window
2. Sort by timestamp
3. Build causality links between consecutive events
4. Find the critical path (highest confidence chain)
5. Score based on event sequence coherence

**Confidence:** 0.5-0.9 (depends on event continuity)

### 2. Pattern Matching

Matches current incident triggers against known patterns.

**Process:**
1. Extract triggers from critical path
2. Compare against COMMON_PATTERNS database
3. Score matches by:
   - Trigger overlap (70% weight)
   - Pattern confidence (30% weight)
4. Return best match

**Confidence:** Pattern confidence (0.5-0.99)

**Common Patterns:**
- Cost Limit Exceeded (92%)
- Permission Denied (87%)
- Dependency Failure (88%)
- Configuration Drift (78%)
- Data Quality Issue (82%)

### 3. Hybrid Analysis

Combines timeline analysis + pattern matching.

**Process:**
1. Run timeline analysis → confidence score C1
2. Run pattern matching → confidence score C2
3. If both succeed: confidence = max(C1, C2)
4. If one fails: use the other

**Confidence:** Often highest (0.7-0.95)

## Best Practices

### 1. Provide Good Incident Summaries

Good summary:
```
"Deployment v2.1.0 failed: cost spike to $5,000/hour, 
triggered by N+1 query in new batch processor"
```

Bad summary:
```
"Something went wrong"
```

### 2. Set Precise Time Windows

- Too narrow: misses causality links
- Too wide: includes noise

Good: incident_start ± 5-10 minutes before detected

### 3. Review Confidence Scores

- ≥ 0.85: High confidence, likely correct
- 0.70-0.85: Good confidence, verify
- 0.50-0.70: Possible, needs investigation
- < 0.50: Insufficient evidence

### 4. Learn from Patterns

- Review similar past incidents
- Understand if remediation matched
- Update pattern confidence if new occurrences

### 5. Automate Remediation

```typescript
// Check RCA confidence before auto-remediation
const rca = await analyzeIncident(input);
if (rca.confidenceScore >= 0.85) {
  await applyRemediationActions(rca.recommendedActions);
  await notifyOps(`Auto-remediated: ${rca.rootCause}`);
}
```

## Error Handling

**Common Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| "No events found" | Time window is empty | Expand incident_end_time |
| "Insufficient data" | <3 events in window | Check incident timestamps |
| "Pattern match low" | New incident type | Review manually, create new pattern |
| "Database error" | Supabase unavailable | Retry with exponential backoff |

## Troubleshooting

### "Root cause confidence is 0.45"

**Problem:** Not enough events to form a causal chain.

**Solution:**
1. Extend time window (add 5-10 min on each side)
2. Check if incident is well-scoped
3. Enable more detailed audit logging
4. Review similar past patterns for hints

### "Pattern match found but seems wrong"

**Problem:** Pattern triggered falsely (low precision).

**Solution:**
1. Check pattern triggers against your incident
2. Reduce pattern confidence if false positives increase
3. Create more specific patterns for your org
4. Verify manually before auto-remediation

### "Similar incidents not found"

**Problem:** No historical data or pattern search too narrow.

**Solution:**
1. Check root_cause_category filter
2. Increase days_back window
3. Lower min_confidence threshold
4. Build more patterns over time

## Next Steps

1. **Custom Patterns** — Add organization-specific patterns
2. **Automated Remediation** — Auto-apply fixes for high-confidence RCAs
3. **Anomaly Detection** — Alert on incidents similar to known failures
4. **Dashboard** — Visualize incident patterns and trends
5. **ML Enhancement** — Train models on RCA feedback

## References

- [DSG Context Discovery (Phase 1)](./MCP_CONTEXT_DISCOVERY.md)
- [Incident Response Plan](./soc2/Incident_Response_Plan.md)
- [CLAUDE.md](../CLAUDE.md) — Truth boundary and claim policy
- [MCP Spec](https://spec.modelcontextprotocol.io)
