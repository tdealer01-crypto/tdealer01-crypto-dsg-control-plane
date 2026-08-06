# Workload Identity Federation

**DSG ONE / ProofGate Control Plane**

Enable secure, keyless authentication for CI/CD pipelines, container orchestration platforms, and other workloads using OpenID Connect (OIDC) workload identity federation.

---

## Overview

Workload identity federation allows external systems (GitHub Actions, Kubernetes, AWS, GCP, etc.) to authenticate to DSG ONE without managing long-lived API keys or credentials.

**Benefits:**
- ✅ No secret rotation required
- ✅ Reduced attack surface (no credentials in CI/CD)
- ✅ Audit trail of workload activities
- ✅ Federated trust model (IdP handles identity)
- ✅ Fine-grained permissions per workload

---

## OIDC Discovery Endpoint

DSG ONE provides an OIDC discovery endpoint for workload identity:

```
https://tdealer01-crypto-dsg-control-plane.vercel.app/.well-known/openid-configuration
```

**Response includes:**
- `issuer` — DSG ONE as OIDC provider
- `jwks_uri` — JWT signing keys endpoint
- `token_endpoint` — Token exchange endpoint
- `response_types_supported` — ["id_token"]

### Get Discovery Document

```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/.well-known/openid-configuration | jq .
```

---

## JWT Token Format

Tokens issued by DSG ONE workload identity have the following claims:

```json
{
  "iss": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
  "sub": "org_id:workflow_id",
  "aud": "workload-type:agent|gate|automation",
  "iat": 1689790800,
  "exp": 1689794400,
  "jti": "token-unique-id",
  "org_id": "org-uuid",
  "workflow_id": "workflow-uuid",
  "workflow_name": "api_gate_evaluate",
  "user_agent": "GitHub-Actions/v1",
  "ip_address": "1.2.3.4"
}
```

**Key claims:**
- `sub` — Identifies the workload (org_id:workflow_id combination)
- `aud` — Audience (workload type) restricts token usage
- `org_id` — Organization that owns the workload
- `workflow_id` — Unique identifier for this workflow
- `workflow_name` — Human-readable workflow name
- `user_agent` — Client making the request
- `ip_address` — Source IP of token request

---

## GitHub Actions Integration

Authenticate GitHub Actions workflows to DSG ONE using OIDC.

### Setup

1. **Create workload in DSG ONE** (optional, auto-created on first use)
   ```bash
   curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/workloads" \
     -H "Authorization: Bearer $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "GitHub Actions CI",
       "type": "github_actions",
       "provider": "github",
       "config": {
         "repo": "owner/repo",
         "workflow_names": ["ci.yml", "deploy.yml"]
       }
     }'
   ```

2. **Configure GitHub Actions workflow** (.github/workflows/dsg-gate.yml)

   ```yaml
   name: DSG Gate Evaluate

   on:
     push:
       branches: [main]

   permissions:
     id-token: write
     contents: read

   jobs:
     gate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Get OIDC Token
           id: oidc
           uses: actions/github-script@v7
           with:
             script: |
               const token = await core.getIDToken('https://tdealer01-crypto-dsg-control-plane.vercel.app');
               core.setOutput('token', token);

         - name: Evaluate DSG Gate
           env:
             DSG_OIDC_TOKEN: ${{ steps.oidc.outputs.token }}
             DSG_API_URL: "https://tdealer01-crypto-dsg-control-plane.vercel.app"
           run: |
             curl -X POST "$DSG_API_URL/api/dsg/v1/gates/evaluate" \
               -H "Authorization: Bearer $DSG_OIDC_TOKEN" \
               -H "Content-Type: application/json" \
               -d '{
                 "planId": "workflow-id",
                 "riskLevel": "medium",
                 "context": {
                   "repo": "${{ github.repository }}",
                   "branch": "${{ github.ref }}",
                   "commit": "${{ github.sha }}"
                 }
               }' | jq .
   ```

### Verification

1. Get token in GitHub Actions:
   ```bash
   OIDC_TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
     "$ACTIONS_ID_TOKEN_REQUEST_URL" | jq -r '.token')
   echo $OIDC_TOKEN
   ```

2. Verify token with DSG ONE:
   ```bash
   curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/oidc/validate" \
     -H "Authorization: Bearer $OIDC_TOKEN" | jq .
   ```

---

## Kubernetes Integration

Use Kubernetes Workload Identity for pods to authenticate to DSG ONE.

### IRSA Setup (AWS)

1. **Create IAM role trust policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/tdealer01-crypto-dsg-control-plane.vercel.app"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "tdealer01-crypto-dsg-control-plane.vercel.app:sub": "k8s_cluster:my-namespace:my-serviceaccount"
           }
         }
       }
     ]
   }
   ```

2. **Create Kubernetes service account**
   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: dsg-agent
     namespace: default
     annotations:
       eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/dsg-agent-role
   ```

3. **Deploy pod with workload identity**
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: dsg-agent
   spec:
     serviceAccountName: dsg-agent
     containers:
       - name: agent
         image: agent:latest
         env:
           - name: DSG_OIDC_TOKEN_FILE
             value: /var/run/secrets/dsg.io/token
         volumeMounts:
           - name: dsg-token
             mountPath: /var/run/secrets/dsg.io
     volumes:
       - name: dsg-token
         projected:
           sources:
             - serviceAccountToken:
                 path: token
                 audience: "https://tdealer01-crypto-dsg-control-plane.vercel.app"
   ```

---

## API Token Exchange

Exchange OIDC tokens for DSG ONE API tokens.

### Token Exchange Endpoint

```
POST /api/oidc/token
```

**Request:**
```json
{
  "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
  "subject_token": "<OIDC_TOKEN>",
  "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
  "resource": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
  "audience": "api://tdealer01-crypto-dsg"
}
```

**Response:**
```json
{
  "access_token": "dsg_token_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token"
}
```

### Exchange Example

```bash
#!/bin/bash

OIDC_TOKEN=$(cat /var/run/secrets/dsg.io/token)
DSG_API_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"

# Exchange OIDC token for API token
RESPONSE=$(curl -X POST "$DSG_API_URL/api/oidc/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
    "subject_token": "'$OIDC_TOKEN'",
    "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
    "resource": "'$DSG_API_URL'",
    "audience": "api://tdealer01-crypto-dsg"
  }')

API_TOKEN=$(echo $RESPONSE | jq -r '.access_token')

# Use API token
curl -X POST "$DSG_API_URL/api/dsg/v1/gates/evaluate" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Scoped Tokens

Tokens can be scoped to specific permissions, reducing blast radius if compromised.

### Request Scoped Token

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/oidc/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
    "subject_token": "'$OIDC_TOKEN'",
    "subject_token_type": "urn:ietf:params:oauth:token-type:id_token",
    "resource": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
    "audience": "api://tdealer01-crypto-dsg",
    "requested_token_use": "access",
    "requested_subject": "workflow:gate_evaluate",
    "requested_scope": "api:gates:read api:gates:evaluate"
  }'
```

**Scoped permissions:**
- `api:health:read` — Read health status
- `api:gates:read` — Read gate policies
- `api:gates:evaluate` — Evaluate gates
- `api:audit:read` — Read audit logs
- `api:execute:read` — Read execution history
- `api:usage:read` — Read usage metrics

---

## Security Best Practices

1. **Validate Issuer**
   - Always verify `iss` claim matches `https://tdealer01-crypto-dsg-control-plane.vercel.app`
   - Prevents token substitution attacks

2. **Validate Audience**
   - Verify `aud` claim matches expected audience
   - Restricts token usage to intended service

3. **Validate Subject**
   - Check `sub` claim matches expected workload
   - Prevents cross-workload token reuse

4. **Check Token Expiration**
   - Tokens valid for 1 hour (`exp` claim)
   - Refresh tokens as needed
   - Short-lived tokens reduce key compromise impact

5. **Audit Workload Activities**
   - All workload API calls logged with workload ID
   - Query audit logs filtering on `actor_id` (workload ID)
   - Monitor for unusual patterns

6. **Rotate Workload Credentials**
   - Even OIDC tokens should be rotated periodically
   - Re-authenticate to IdP every 30 days minimum
   - Alert on failed workload authentication

---

## Troubleshooting

### Token Validation Fails

**Error:** `aud` mismatch

**Fix:** Ensure audience matches expected value:
```bash
# Decode JWT to check claims
echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson'
```

### Exchange Endpoint Returns 401

**Error:** Unauthorized

**Causes:**
- OIDC token expired or invalid
- Issuer mismatch
- Subject not recognized

**Debug:**
```bash
# Check token expiration
echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson | .exp'

# Compare with current time
date +%s
```

### Scope Restrictions Not Enforced

**Error:** Token grants more permissions than requested

**Fix:** Verify workload scope configuration matches requested scopes:
```bash
curl -X GET "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/admin/workloads/{workload_id}" \
  -H "Authorization: Bearer $ADMIN_API_KEY" | jq '.scopes'
```

---

## Roadmap

**Phase 1 (✅ Current):** OIDC discovery, token format, GitHub Actions integration

**Phase 2 (⏳ Planned):** Kubernetes IRSA, token exchange scoping, workload management API

**Phase 3 (⏳ Planned):** Multi-cloud support (GCP Workload Identity, Azure Managed Identity)

**Phase 4 (⏳ Planned):** Credential broker for long-lived workload secrets, certificate pinning

---

**Questions?** Contact: [engineering@dsg.pics](mailto:engineering@dsg.pics)

**Last Updated:** 2026-07-19
