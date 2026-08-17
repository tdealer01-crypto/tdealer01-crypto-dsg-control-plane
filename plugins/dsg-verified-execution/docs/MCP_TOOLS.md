# DSG Verified Execution — MCP Tools Reference

This document describes the 4 MCP tools exposed by the DSG Verified Execution plugin.

## Tool: `plan_alignment`

Check if a proposed execution aligns with the agent's approved plan.

### Purpose

When an agent has been given an approved plan (identified by `plan_hash`), this tool verifies that the action being executed falls within the scope and constraints of that plan.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "Unique identifier for the executing agent (e.g., 'agent-copilot-123')"
    },
    "action": {
      "type": "string",
      "description": "The action being verified (e.g., 'modify_config', 'write_audit_log')"
    },
    "plan_hash": {
      "type": "string",
      "description": "Cryptographic hash of the approved plan (SHA256, e.g., 'sha256:abc123...')"
    },
    "context": {
      "type": "object",
      "description": "Execution context: parameters, environment, state being modified",
      "example": {
        "config_key": "feature_flags",
        "value": { "new_feature": true }
      }
    }
  },
  "required": ["agent_id", "action", "plan_hash"]
}
```

### Output schema

```json
{
  "decision": "ALLOW | BLOCK | REVIEW",
  "reason": "string",
  "alignment_score": 0-100,
  "matched_plan_items": ["string"],
  "deviations": ["string"]
}
```

### Example

**Request:**
```json
{
  "agent_id": "agent-copilot-dev-123",
  "action": "update_database_config",
  "plan_hash": "sha256:e1d3c1f5...",
  "context": {
    "table": "feature_config",
    "key": "max_concurrent_users",
    "new_value": 500
  }
}
```

**Response (ALLOW):**
```json
{
  "decision": "ALLOW",
  "reason": "Action modifies only approved keys: 'max_concurrent_users' is in plan scope",
  "alignment_score": 1.0,
  "matched_plan_items": ["config.update", "table:feature_config"],
  "deviations": []
}
```

**Response (BLOCK):**
```json
{
  "decision": "BLOCK",
  "reason": "Action attempts to modify unapproved resource",
  "alignment_score": 0.2,
  "matched_plan_items": [],
  "deviations": [
    "Target table 'user_secrets' is not in approved plan scope",
    "Action 'delete' exceeds approved verb 'read,write'"
  ]
}
```

### When to use

- ✅ Agent has an approved plan and wants to verify the next action aligns
- ✅ Agent needs to understand what changes are within plan scope
- ❌ Agent has no approved plan (use `constraint_evaluate` instead)
- ❌ Action is exploratory/speculative (use `constraint_evaluate` for general constraints)

---

## Tool: `constraint_evaluate`

Evaluate whether an action satisfies DSG governance constraints (independent of plan).

### Purpose

This is the core constraint gate. It checks if an action violates any of DSG ONE's configured constraints (resource access, risk levels, approval requirements, quotas, time windows, etc.).

Use this when:
- You want to know if an action is generally allowed
- No approved plan exists yet
- You want to evaluate constraints without plan context

### Input schema

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "Unique agent identifier"
    },
    "action": {
      "type": "string",
      "description": "The action to evaluate"
    },
    "target_resource": {
      "type": "string",
      "description": "Resource being targeted (e.g., 'users_table', 'billing_api', 'file_system')"
    },
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "Risk level of the action (optional, defaults to 'medium')"
    },
    "reason": {
      "type": "string",
      "description": "Why the agent is performing this action (for audit trail)"
    }
  },
  "required": ["agent_id", "action", "target_resource"]
}
```

### Output schema

```json
{
  "decision": "ALLOW | BLOCK | REVIEW",
  "reason": "string",
  "violated_constraints": ["string"],
  "satisfied_constraints": ["string"],
  "approval_required": false,
  "approval_chain": ["string"]
}
```

### Example

**Request (Low risk, allowed resource):**
```json
{
  "agent_id": "agent-claude-prod-789",
  "action": "read_analytics",
  "target_resource": "analytics_table",
  "risk_level": "low",
  "reason": "Daily report generation"
}
```

**Response:**
```json
{
  "decision": "ALLOW",
  "reason": "Read-only action on approved resource",
  "violated_constraints": [],
  "satisfied_constraints": [
    "resource_access:analytics_table:allow",
    "risk_level:low:no_approval_needed",
    "quota:daily_reads:ok"
  ],
  "approval_required": false,
  "approval_chain": []
}
```

**Request (High risk, requires approval):**
```json
{
  "agent_id": "agent-devops-123",
  "action": "delete_backup",
  "target_resource": "backup_storage",
  "risk_level": "high",
  "reason": "Cleanup old backups"
}
```

**Response:**
```json
{
  "decision": "REVIEW",
  "reason": "High-risk action requires approval before execution",
  "violated_constraints": [],
  "satisfied_constraints": [
    "resource_access:backup_storage:allow"
  ],
  "approval_required": true,
  "approval_chain": [
    "dsg_admin",
    "infrastructure_owner"
  ]
}
```

### When to use

- ✅ General constraint checking (with or without plan)
- ✅ Exploratory: "Is this action allowed?"
- ✅ High-risk actions that need approval chains
- ✅ Quota/rate limit checking
- ❌ Detailed plan alignment (use `plan_alignment` with plan_hash)

### Constraint types

DSG evaluates these constraint categories:

| Constraint | Examples |
|-----------|----------|
| **Resource Access** | Which tables/APIs/files can be accessed |
| **Action Verbs** | CRUD operations (read, write, delete, execute) |
| **Risk Level** | low/medium/high determine approval requirements |
| **Quotas** | Rate limits, concurrent action limits |
| **Time Windows** | Execution allowed only during certain hours |
| **Approval Chain** | Who must approve before execution |
| **Data Classification** | PII, financial, health data handling |

---

## Tool: `execution_proof_request`

Submit an execution result and generate cryptographic proof.

### Purpose

After an action has been executed (outside DSG), submit the result and receive a deterministic proof. This proof can be used for:
- Compliance audits
- Formal verification
- Replay/reproducibility
- Evidence chains

The proof is **deterministic**: same inputs always produce same proof hash.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "Executing agent"
    },
    "action": {
      "type": "string",
      "description": "The action that was executed"
    },
    "result": {
      "type": "object",
      "description": "Execution result (success/failure, output, side effects)",
      "example": {
        "success": true,
        "rows_affected": 42,
        "duration_ms": 234
      }
    },
    "plan_hash": {
      "type": "string",
      "description": "Hash of the plan that authorized this execution (optional)"
    },
    "timestamp": {
      "type": "string",
      "description": "ISO 8601 execution timestamp (optional, defaults to now)"
    },
    "context": {
      "type": "object",
      "description": "Additional execution context for proof"
    }
  },
  "required": ["agent_id", "action", "result"]
}
```

### Output schema

```json
{
  "decision": "ALLOW | BLOCK | REVIEW",
  "reason": "string",
  "proof": {
    "hash": "sha256:...",
    "schema": "ccvs-makk8-z3-proof-v1",
    "timestamp": "ISO 8601"
  },
  "evidence": {
    "execution_trace": {
      "action": "string",
      "result": "object",
      "plan_hash": "string",
      "timestamp": "string"
    },
    "lineage": ["string"]
  }
}
```

### Example

**Request:**
```json
{
  "agent_id": "agent-batch-jobs-555",
  "action": "archive_historical_logs",
  "result": {
    "success": true,
    "archived_records": 1000000,
    "archive_location": "s3://backups/2024-08-17/",
    "duration_ms": 45000,
    "checksum": "sha256:xyz789..."
  },
  "plan_hash": "sha256:abc123def456...",
  "timestamp": "2024-08-17T14:32:00Z"
}
```

**Response:**
```json
{
  "decision": "ALLOW",
  "reason": "Execution is deterministic and reproducible",
  "proof": {
    "hash": "sha256:proof_hash_deterministic_from_inputs...",
    "schema": "ccvs-makk8-z3-proof-v1",
    "timestamp": "2024-08-17T14:32:05Z"
  },
  "evidence": {
    "execution_trace": {
      "action": "archive_historical_logs",
      "result": {
        "success": true,
        "archived_records": 1000000
      },
      "plan_hash": "sha256:abc123def456...",
      "timestamp": "2024-08-17T14:32:00Z"
    },
    "lineage": [
      "intent:agent-batch-555:2024-08-17T14:31:50Z",
      "plan:align:2024-08-17T14:31:55Z",
      "gate:constraint_evaluate:2024-08-17T14:31:58Z",
      "execute:archive:2024-08-17T14:32:00Z",
      "proof:generate:2024-08-17T14:32:05Z"
    ]
  }
}
```

### When to use

- ✅ After an action has been executed, to get proof
- ✅ Building compliance/audit trails
- ✅ Formal verification workflows
- ✅ Replay/reproducibility testing
- ❌ Before execution (use `constraint_evaluate` to gate first)

### Proof properties

The generated proof is:
- **Deterministic**: Same action + result + plan always produces same hash
- **Reproducible**: Can be verified offline
- **Immutable**: Reflects exactly what was executed
- **Chainable**: Proof hashes can be linked for audit trails

---

## Tool: `evidence_retrieve`

Retrieve audit trail, execution history, and proofs.

### Purpose

Query the audit log for compliance, forensics, or operational visibility. Retrieve:
- Past executions by an agent
- Proofs from previous operations
- Full lineage/audit chains
- Filtered by time range, agent, execution ID, etc.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "agent_id": {
      "type": "string",
      "description": "Agent to query (required)"
    },
    "execution_id": {
      "type": "string",
      "description": "Specific execution to retrieve (optional)"
    },
    "time_range": {
      "type": "object",
      "properties": {
        "start": {
          "type": "string",
          "description": "ISO 8601 start time"
        },
        "end": {
          "type": "string",
          "description": "ISO 8601 end time"
        }
      },
      "description": "Time range for query (optional, defaults to last 24 hours)"
    },
    "include_proofs": {
      "type": "boolean",
      "description": "Include proofs in response (default: false)"
    },
    "action_filter": {
      "type": "string",
      "description": "Filter by action name (e.g., 'write_*' matches write operations)"
    },
    "decision_filter": {
      "type": "string",
      "enum": ["ALLOW", "BLOCK", "REVIEW"],
      "description": "Filter by decision type"
    }
  },
  "required": ["agent_id"]
}
```

### Output schema

```json
{
  "decision": "ALLOW",
  "evidence": {
    "total_executions": 42,
    "execution_records": [
      {
        "execution_id": "exec-789",
        "agent_id": "agent-123",
        "action": "write_audit_log",
        "timestamp": "ISO 8601",
        "decision": "ALLOW | BLOCK | REVIEW",
        "result": "object",
        "plan_hash": "string"
      }
    ],
    "proofs": [
      {
        "execution_id": "exec-789",
        "proof_hash": "sha256:...",
        "timestamp": "ISO 8601"
      }
    ],
    "lineage": [
      "intent:agent-123:...",
      "gate:constraint_evaluate:...",
      "proof:generate:..."
    ]
  }
}
```

### Example

**Request (Last 7 days):**
```json
{
  "agent_id": "agent-prod-analytics",
  "time_range": {
    "start": "2024-08-10T00:00:00Z",
    "end": "2024-08-17T23:59:59Z"
  },
  "include_proofs": true,
  "decision_filter": "ALLOW"
}
```

**Response:**
```json
{
  "decision": "ALLOW",
  "evidence": {
    "total_executions": 24,
    "execution_records": [
      {
        "execution_id": "exec-001",
        "agent_id": "agent-prod-analytics",
        "action": "generate_report",
        "timestamp": "2024-08-17T09:15:00Z",
        "decision": "ALLOW",
        "result": {
          "success": true,
          "report_id": "rpt-789",
          "recipients": 42
        },
        "plan_hash": null
      },
      {
        "execution_id": "exec-002",
        "agent_id": "agent-prod-analytics",
        "action": "email_distribution",
        "timestamp": "2024-08-17T09:15:30Z",
        "decision": "ALLOW",
        "result": {
          "success": true,
          "emails_sent": 42
        },
        "plan_hash": null
      }
    ],
    "proofs": [
      {
        "execution_id": "exec-001",
        "proof_hash": "sha256:abc123...",
        "timestamp": "2024-08-17T09:15:02Z"
      },
      {
        "execution_id": "exec-002",
        "proof_hash": "sha256:def456...",
        "timestamp": "2024-08-17T09:15:32Z"
      }
    ],
    "lineage": [
      "intent:agent-analytics:2024-08-17T09:15:00Z",
      "gate:constraint_evaluate:2024-08-17T09:15:01Z",
      "execute:generate_report:2024-08-17T09:15:00Z",
      "proof:generate:2024-08-17T09:15:02Z"
    ]
  }
}
```

### When to use

- ✅ Audit/compliance reviews
- ✅ Debugging unexpected behavior
- ✅ Forensics (what did this agent do?)
- ✅ Proof verification (download proofs for offline analysis)
- ✅ Performance analysis (timeline of executions)

---

## Tool interaction patterns

### Pattern 1: Plan-based execution (most common)

```
1. agent has approved plan (plan_hash)
2. agent calls plan_alignment
   → check if action is in plan scope
3. agent calls constraint_evaluate
   → check general governance constraints
4. [if REVIEW: request approval]
5. agent executes action
6. agent calls execution_proof_request
   → generate proof of execution
7. later: evidence_retrieve
   → audit trail for compliance
```

### Pattern 2: Ad hoc constraint checking (no plan)

```
1. agent calls constraint_evaluate
   → check if action is allowed
2. [if REVIEW: request approval]
3. agent executes action
4. agent calls execution_proof_request
   → generate proof
```

### Pattern 3: Audit/forensics

```
1. auditor/admin calls evidence_retrieve
   → get execution history for agent
2. auditor inspects proofs
   → verify determinism + reproducibility
3. auditor verifies lineage
   → confirm full chain of approvals
```

---

## Decision mapping

| Tool | ALLOW | BLOCK | REVIEW |
|------|-------|-------|--------|
| `plan_alignment` | Action in plan scope | Action outside plan | Plan requires approval |
| `constraint_evaluate` | No violations | Constraint violated | Approval required |
| `execution_proof_request` | Proof generated | Proof invalid | Unusual result |
| `evidence_retrieve` | Records found | No access to records | Partial records |

---

## Error codes

| Code | Meaning | Resolution |
|------|---------|-----------|
| 401 | Unauthorized (invalid API key) | Regenerate `DSG_API_KEY` |
| 403 | Forbidden (agent lacks permission) | Check agent registration + permissions |
| 404 | Not found (plan_hash doesn't exist) | Verify plan_hash or use constraint_evaluate |
| 429 | Rate limited | Wait, then retry (see rate limits in API guide) |
| 500 | Server error | Check logs, contact support |

---

## Best practices

1. **Always use `plan_alignment` + `constraint_evaluate`** in sequence for critical actions
2. **Include `plan_hash`** when you have an approved plan (enables stronger verification)
3. **Request `evidence_request: true`** for high-risk operations (captures full audit trail)
4. **Cache proofs** — same inputs always produce same proof, avoid redundant calls
5. **Monitor decision distribution** — sudden spike in BLOCKs may indicate policy misconfiguration
6. **Archive evidence regularly** — ensure compliance data is retained per regulations
