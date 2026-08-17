# Trinity API Service

Mock Trinity MCP API server for DSG revenue metrics and cost tracking.

## Setup

```bash
cd trinity-api-service
npm install
npm start
```

Service runs on `http://localhost:3001`

## Endpoints

### Health Check
```
GET /health
```

### Cost Metrics
```
GET /api/trinity/costs?period=24h
Authorization: Bearer <JWT_TOKEN>
```

Query parameters:
- `period`: '1h', '24h', '7d' (default: '24h')

Response:
```json
{
  "ok": true,
  "period": "24h",
  "total_cost": 1245.30,
  "agents": [
    {
      "agent_name": "assistant-executor",
      "jobs_processed": 1247,
      "cpu_usage": 65.5,
      "agent_cost_usd": 435.86
    }
  ],
  "fragmentation_risk": 0.12,
  "context_sharing": 0.78,
  "timestamp": "2026-08-17T07:27:00Z"
}
```

### Status
```
GET /api/trinity/status
Authorization: Bearer <JWT_TOKEN>
```

## JWT Token

Generate token:
```bash
HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64)
PAYLOAD=$(echo -n '{"iss":"trinity-dsg","sub":"revenue-sync"}' | base64)
SIGNATURE=$(echo -n "..." | openssl dgst -sha256 -hmac "trinity-secret-key" -binary | base64)
TOKEN="$HEADER.$PAYLOAD.$SIGNATURE"
```

## Deployment

Deploy to Render or similar:
1. Push to GitHub
2. Connect to Render (or deploy platform)
3. Set `TRINITY_API_URL` and `TRINITY_JWT_TOKEN` in control plane secrets

Example URLs:
- Development: `http://localhost:3001`
- Production: `https://trinity-api-dsg.onrender.com`
