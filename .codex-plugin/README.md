# DSG Control Plane Codex Plugin

The **DSG ONE / ProofGate Control Plane** plugin for Codex enables AI runtime governance with deterministic gates, compliance evidence collection, and formal proof validation.

## Overview

This plugin provides governed execution for AI agents through:

- **Deterministic Gates**: Policy-driven action evaluation with formal constraints
- **Compliance Evidence**: Automated evidence collection (L1-L5 CCVS levels)
- **Formal Proofs**: Z3 SMT solver validation for policy constraints
- **Audit Trails**: Immutable records of all governance decisions

## Features

### 1. Action Gating (DSG Action Gate)
Gate AI actions before execution with deterministic policy evaluation.

```
Action: "execute_code"
Policy Check: Risk assessment, resource access validation
Decision: PASS/REVIEW/BLOCK with proof hash for audit replay
```

### 2. Compliance Evidence (DSG Compliance Evidence)
Generate shareable evidence packs demonstrating compliance.

```
Execution → Policy Evaluation → Evidence Collection → Compliance Matrix
```

### 3. Formal Proofs (DSG Formal Proof)
Validate policy constraints using formal methods (Z3 SMT solver).

```
Policy Constraint → SMT Solver → Proof Output → Confidence Level
```

## Installation

The plugin is registered in `.codex-plugin/` and automatically discovered by Codex.

### Prerequisites

- Node.js 18+
- Next.js 15+ (App Router)
- Supabase project
- OPENROUTER_API_KEY (for chat integration)

### Directory Structure

```
.codex-plugin/
├── plugin.json                    # Main configuration
├── skills/
│   ├── dsg-action-gate.json       # Action gating skill
│   ├── dsg-compliance-evidence.json # Evidence generation
│   └── dsg-formal-proof.json      # Formal proof validation
├── assets/
│   ├── logo.svg                   # Plugin logo
│   └── composer-icon.svg          # Composer UI icon
└── README.md                      # This file
```

## Skills

### dsg-action-gate
**Endpoint**: `POST /api/dsg/v1/gates/evaluate`

Gate an action through the DSG deterministic policy engine.

**Input**:
```json
{
  "action": "execute_code",
  "context": {
    "agent_id": "agent-123",
    "resource": "production-db",
    "intent": "SELECT query"
  },
  "risk_level": "medium"
}
```

**Output**:
```json
{
  "decision": "PASS",
  "reason": "Action approved under policy_v1.0",
  "proof_hash": "sha256:abc123...",
  "policy_version": "1.0"
}
```

---

### dsg-compliance-evidence
**Endpoint**: `POST /api/compliance-evidence-pack`

Generate compliance evidence for an execution.

**Input**:
```json
{
  "execution_id": "exec-abc123",
  "include_proofs": true,
  "include_audit_trail": true
}
```

**Output**:
```json
{
  "evidence_id": "evidence-abc123",
  "execution_hash": "sha256:exec123...",
  "policy_version": "1.0",
  "compliance_matrix": {
    "L1": "unit evidence ✓",
    "L2": "integration evidence ✓",
    "L3": "adversarial replay ✓"
  }
}
```

---

### dsg-formal-proof
**Endpoint**: `POST /api/dsg/v1/proofs/prove`

Validate policy constraints using formal methods.

**Input**:
```json
{
  "policy_constraint": "(assert (=> (= agent \"trusted\") (= allowed true)))",
  "execution_context": { "agent": "trusted" },
  "solver": "z3"
}
```

**Output**:
```json
{
  "valid": true,
  "proof": "sat",
  "proof_hash": "sha256:proof123...",
  "confidence": "CONFIRMED"
}
```

## Usage Examples

### Example 1: Gate an Agent Action
```
User: "Gate this code execution for agent-123"
Plugin: Calls dsg-action-gate with execution context
Result: PASS/REVIEW/BLOCK decision with proof hash
```

### Example 2: Generate Compliance Pack
```
User: "Generate compliance evidence for execution exec-abc123"
Plugin: Calls dsg-compliance-evidence
Result: Evidence pack with L1-L5 compliance levels
```

### Example 3: Verify Policy Constraint
```
User: "Prove that only trusted agents can access this resource"
Plugin: Calls dsg-formal-proof with policy constraint
Result: Proof validation with confidence level
```

## API Routes

The plugin integrates with these DSG control plane routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/dsg/v1/gates/evaluate` | POST | Evaluate action through gate |
| `/api/dsg/v1/proofs/prove` | POST | Generate formal proof |
| `/api/dsg/v1/policies/manifest` | GET | Get current policy manifest |
| `/api/compliance-evidence-pack` | POST | Generate evidence pack |
| `/api/execute` | POST | Stable execution entry point |
| `/api/agent/status` | GET | Agent status probe |

## Configuration

### Environment Variables

Set these in `.env.local` or Vercel:

```bash
OPENROUTER_API_KEY=your-api-key        # For chat integration
SUPABASE_PROJECT_ID=your-project       # Supabase project
SUPABASE_SERVICE_ROLE_KEY=your-key     # Supabase service role
```

### Skills Activation

Skills are automatically available through the plugin interface. No additional configuration needed.

## Development

### Local Testing

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Type check
npm run typecheck

# Generate evidence
npm run ccvs:pipeline
```

### Plugin Schema Validation

Ensure all skills conform to the schema in `plugin.json`:

```bash
# Validate plugin structure
node scripts/validate-codex-plugin.mjs
```

## Security Considerations

- **Authentication**: All routes require Supabase auth (JWT in Bearer token)
- **Rate Limiting**: DSG bridge applies rate limits (20 req/min per user)
- **Secrets**: Never expose API keys in plugin definitions
- **Policy Validation**: Gate decisions are deterministic and reproducible

## Compliance

This plugin helps achieve:

- **Audit Readiness**: Evidence-driven execution records
- **Governance Compliance**: Policy-gated action execution
- **Formal Verification**: SMT-based constraint validation
- **Reproducibility**: Proof hashes enable audit replay

## Troubleshooting

### Route not found (404)
Ensure `/api/dsg/v1/gates/evaluate` and other routes are deployed to Vercel.

### Policy version mismatch
Check that the policy version in your execution context matches the deployed version.

### Proof validation fails
Verify the SMT constraint syntax and execution context variables are correctly formatted.

## References

- [DSG Control Plane Documentation](https://tdealer01-crypto-dsg-control-plane.vercel.app)
- [Codex Plugin Specification](https://docs.codex.ai/plugins)
- [Z3 SMT Solver Documentation](https://github.com/Z3Prover/z3)
- [CCVS Evidence Levels](docs/CCVS_EVIDENCE_LEVELS.md)

## License

MIT

## Support

For issues or questions:
- Email: t.dealer01@dsg.pics
- Repository: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
