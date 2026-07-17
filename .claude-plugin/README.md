# DSG Governance Control Plane — Claude Code Plugin

Production AI governance control plane for Claude Code. Makes every Agent decision provable, auditable, and replayable.

## 🚀 Installation

### Claude Code CLI
```bash
claude plugin add https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

### Claude.ai
Marketplace listing coming soon. For now, add the marketplace directly via the Claude Code CLI command above.

## 📋 Features

### 1. Deterministic Safety Gate (`dsg-action-layer-ged`)
- Policy evaluation with deterministic outcomes (PASS/BLOCK/REVIEW/UNSUPPORTED)
- Z3/SMT-style formal verification
- Quota enforcement and pricing per evaluation
- Cryptographic proof generation

### 2. Replayable Governance
- Deterministic replay of decisions
- Hash-based evidence tracking (proofHash, policyVersion, inputHash, constraintSetHash)
- Compliance regulation mapping
- SOC2/ISO27001/NIST/EU AI Act claim support

### 3. Compliance Evidence Pack
- L1–L5 evidence levels (unit to provenance)
- CCVS pipeline integration
- Audit trail capture
- Governance decision evidence

### 4. Runtime Lifecycle Management
- Before/During/After action governance
- Risk level → governance posture mapping
- Quota enforcement
- Execution approval workflow

### 5. Hermes Controlled Executor
- Zero Trust execution flow
- planHash lock verification
- Conformance gate validation
- Credential lease with fingerprint (no raw secrets)
- Evidence capture for every execution

## 💡 Quick Start

### Step 1: Authenticate
Use your DSG API key (contact sales@dsg.pics for production tier):
```bash
export DSG_API_KEY="sk_live_..."
```

### Step 2: Check the Gate
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp-server \
  -H "Authorization: Bearer ${DSG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Step 3: Evaluate an Action
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
  -H "Authorization: Bearer ${DSG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "action": "deploy to production",
      "actor": "agent-1",
      "tool": "deploy"
    },
    "nonce": "'"$(openssl rand -hex 16)"'",
    "idempotencyKey": "'"$(uuidgen)"'",
    "riskLevel": "high"
  }'
```

Response:
```json
{
  "ok": true,
  "gateStatus": "PASS",
  "riskLevel": "high",
  "reason": "All constraints satisfied.",
  "proof": {
    "proofId": "proof_...",
    "policyVersion": "1.0.0"
  }
}
```

## 🔐 Security

- **OAuth 2.0 + PKCE**: RFC 6749, RFC 7636 compliant remote connector setup
- **Deterministic Gates**: Z3/SMT formal verification (local, no external solver)
- **Token Revocation**: RFC 7009 compliant OAuth token management
- **Rate Limiting**: 60 evaluations/min per organization
- **Metered Billing**: Pay-per-evaluation, automatic quota enforcement

## 📚 Documentation

- **[MCP Integration Guide](../docs/MCP_INTEGRATION_GUIDE.md)** — OAuth setup, token validation, subscription checking
- **[SKILL Guide](./SKILL.md)** — Skill definitions, trigger phrases, tool parameters
- **[Compliance Matrix](../docs/CCVS_MATRIX.md)** — L1–L5 evidence mapping, SOC2/ISO27001 claims

## 🚀 Production Readiness

- ✅ Deterministic gate scaffold with TypeScript static checks
- ✅ Policy version and constraint set hashing
- ✅ OAuth 2.0 authorization server metadata (RFC 8414)
- ✅ Token revocation (RFC 7009)
- ✅ Metered billing and quota enforcement
- ⚠️ External Z3 solver invocation not yet in production (local gate only)

## 📞 Support

- GitHub Issues: [tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues)
- Email: support@dsg.pics
- Docs: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
