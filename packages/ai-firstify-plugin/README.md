# DSG AI-Firstify Plugin

Advanced governance and customization plugin for AI-first operations within the DSG platform.

## Overview

The AI-Firstify Plugin extends DSG ONE's control plane to provide comprehensive governance for AI model deployment, execution, and monitoring. It enables:

- **AI Model Governance** - Gate AI model operations before execution
- **Policy Enforcement** - Apply custom rules and compliance policies to AI workflows
- **Audit Trails** - Complete audit trail for all AI operations
- **Custom Rules** - Create and manage AI-specific governance rules

## Project Structure

```
packages/ai-firstify-plugin/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hono app initialization
│   ├── lib/
│   │   ├── dsg-client.ts     # DSG SDK wrapper
│   │   ├── config.ts         # Configuration management
│   │   └── types.ts          # TypeScript type definitions
│   ├── handlers/
│   │   ├── governance-handler.ts  # Governance evaluation
│   │   ├── policy-handler.ts      # Policy management
│   │   └── audit-handler.ts       # Audit logging
│   └── routes/
│       ├── health.ts         # Health check endpoints
│       ├── governance.ts      # Governance API routes
│       ├── policy.ts          # Policy management routes
│       └── audit.ts           # Audit logging routes
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── ai-firstify-plugin.json   # Plugin manifest
└── .env.example
```

## Development Setup

### Prerequisites

- Node.js 20+
- DSG Control Plane access
- Supabase project
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Configuration

Set these environment variables in `.env`:

```
DSG_API_BASE=https://tdealer01-crypto-dsg-control-plane.vercel.app
DSG_API_KEY=your-dsg-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
REDIS_URL=your-redis-url (optional)
```

### Running Locally

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Build
npm run build

# Tests
npm run test
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns health status and DSG connection check.

### Governance

**Evaluate AI Model Governance**

```bash
POST /api/v1/governance/evaluate
Content-Type: application/json

{
  "modelId": "gpt-4",
  "action": "deploy",
  "context": {
    "environment": "production",
    "region": "us-east-1",
    "riskLevel": "high"
  }
}
```

Response:
```json
{
  "decision": "review",
  "reason": "Requires approval for production deployment",
  "policies": ["policy-1", "policy-2"],
  "proofReference": "proof-123",
  "metadata": {}
}
```

**Get Policy Manifest**

```bash
GET /api/v1/governance/manifest
```

### Policies

**List Policies**

```bash
GET /api/v1/policies
```

**Create Policy**

```bash
POST /api/v1/policies
Content-Type: application/json

{
  "name": "Production Deployment Gate",
  "description": "Governance rules for production AI deployments",
  "riskLevel": "high",
  "rules": [
    {
      "condition": "environment == production",
      "action": "review",
      "severity": "critical"
    }
  ]
}
```

**Get Policy**

```bash
GET /api/v1/policies/:id
```

**Update Policy**

```bash
PUT /api/v1/policies/:id
Content-Type: application/json

{
  "enabled": false
}
```

**Delete Policy**

```bash
DELETE /api/v1/policies/:id
```

### Audit

**List Audit Logs**

```bash
GET /api/v1/audit?eventType=governance&resourceType=model&limit=50&offset=0
```

**Log Audit Event**

```bash
POST /api/v1/audit
Content-Type: application/json

{
  "eventType": "model_deployment",
  "resourceType": "model",
  "resourceId": "gpt-4",
  "action": "deploy",
  "userId": "user-123",
  "details": {
    "region": "us-east-1",
    "version": "4"
  }
}
```

**Get Audit Log**

```bash
GET /api/v1/audit/:id
```

## Integration with DSG Control Plane

The plugin integrates with DSG Control Plane via:

- `POST /api/dsg/v1/gates/evaluate` - For governance decisions
- `GET /api/dsg/v1/policies/manifest` - For policy configuration
- `GET /api/health` - For health checks

## Features

### Real-Time Governance

Gate AI model operations with real-time policy evaluation through the DSG control plane.

### Audit Trail

Every governance decision, policy change, and audit event is logged for complete compliance tracking.

### Custom Rules

Define custom governance rules specific to your AI workflows and compliance requirements.

### Policy Versioning

Track policy versions and changes over time for compliance and rollback purposes.

## Next Steps

- [ ] Database-backed policy storage (Supabase)
- [ ] Redis caching for policies
- [ ] Advanced policy templating
- [ ] Webhook integrations
- [ ] UI Dashboard
- [ ] AI model registry integration

## Support

For support, contact: support@dsg.pics

## License

PROPRIETARY - DSG Platform
