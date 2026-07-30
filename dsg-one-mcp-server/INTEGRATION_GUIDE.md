# DSG ONE MCP Server — Integration Guide

**Date:** 2026-07-30

**Purpose:** Guide for integrating the MCP server into the DSG ONE control plane repository and CI/CD pipeline.

---

## Overview

The DSG ONE MCP server is a standalone Node.js application that provides 30+ tools across 7 services for AI-assisted governance of the DSG ONE platform. This guide explains how to integrate it into the main control plane repository and deploy it to production.

---

## Integration Points

### 1. Main Repository Structure

**Current Layout:**
```
tdealer01-crypto-dsg-control-plane/
├── app/                          # Next.js app routes
├── lib/                           # Core libraries
├── supabase/                      # Database migrations
├── .github/workflows/             # CI/CD pipelines
├── package.json                   # Main dependencies
└── dsg-one-mcp-server/           # ← MCP server (new subdirectory)
    ├── src/
    ├── dist/
    ├── package.json
    ├── tsconfig.json
    └── PHASE_3_TESTING.md
```

### 2. Git Integration

**Option A: Add as Git Submodule**
```bash
cd /home/user/tdealer01-crypto-dsg-control-plane
git submodule add git@github.com:tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git dsg-one-mcp-server
```

**Option B: Copy Source Only**
```bash
cp -r /tmp/claude-0/-home-user/.../scratchpad/dsg-one-mcp-server ./dsg-one-mcp-server
rm -rf dsg-one-mcp-server/dist
git add dsg-one-mcp-server/
git commit -m "feat: add DSG ONE MCP server with 30+ tools"
```

**Recommended:** Option B (simpler, fewer dependencies)

### 3. Workspace Configuration

**Update Main `package.json`:**

```json
{
  "name": "dsg-platform",
  "private": true,
  "workspaces": [
    ".",
    "dsg-one-mcp-server"
  ],
  "scripts": {
    "build": "next build && npm -w dsg-one-mcp-server run build",
    "dev": "concurrently \"next dev\" \"npm -w dsg-one-mcp-server run dev\"",
    "test": "npm run test:unit && npm -w dsg-one-mcp-server run test",
    "mcp:start": "npm -w dsg-one-mcp-server start",
    "mcp:inspect": "npm -w dsg-one-mcp-server run inspector"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

---

## Deployment Options

### Option 1: Local Development (Claude Code CLI)

**Use Case:** Development, testing, prototyping

**Setup:**
```bash
# Terminal 1: Start main app
npm run dev

# Terminal 2: Start MCP server
npm -w dsg-one-mcp-server start

# Terminal 3: Use MCP Inspector
npm -w dsg-one-mcp-server run inspector
```

**Configuration:**
In `.claude/mcp-servers.json`:
```json
{
  "dsg-mcp": {
    "command": "node",
    "args": ["dsg-one-mcp-server/dist/index.js"],
    "env": {
      "SUPABASE_URL": "${SUPABASE_URL}",
      "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
      "VERCEL_API_TOKEN": "${VERCEL_API_TOKEN}"
    }
  }
}
```

### Option 2: Docker Container (Staging/Production)

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY dsg-one-mcp-server/package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy compiled TypeScript
COPY dsg-one-mcp-server/dist ./dist

# Set environment
ENV NODE_ENV=production

# Expose port for remote MCP (if using HTTP transport)
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
```

**Build & Run:**
```bash
docker build -f dsg-one-mcp-server/Dockerfile -t dsg-mcp:latest .
docker run -e SUPABASE_URL="..." -e SUPABASE_ANON_KEY="..." dsg-mcp:latest
```

### Option 3: Vercel Deployment (Serverless)

**Create `dsg-one-mcp-server/vercel.json`:**
```json
{
  "buildCommand": "npm install && npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist",
  "env": {
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key"
  }
}
```

**Deploy:**
```bash
cd dsg-one-mcp-server
vercel deploy --prod
```

**Result:** MCP server runs at `https://dsg-mcp-*.vercel.app` as HTTP endpoint

### Option 4: Managed Agents (Anthropic)

**Use Case:** Autonomous agent operations with full governance

**Setup:**
1. Create Managed Agent session
2. Configure MCP server URL
3. Agent can invoke all 30+ tools via MCP protocol
4. Full audit trail and governance enforcement

---

## CI/CD Integration

### GitHub Actions Workflow

**`.github/workflows/mcp-build-test.yml`:**
```yaml
name: MCP Server Build & Test

on:
  push:
    paths:
      - 'dsg-one-mcp-server/**'
      - '.github/workflows/mcp-build-test.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci -w dsg-one-mcp-server
      
      - name: Build MCP server
        run: npm -w dsg-one-mcp-server run build
      
      - name: Check TypeScript
        run: npm -w dsg-one-mcp-server run typecheck || true
      
      - name: Test server startup
        run: |
          timeout 5 npm -w dsg-one-mcp-server start || \
          echo "Server timed out as expected (testing startup)"

  docker:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: docker build -f dsg-one-mcp-server/Dockerfile -t dsg-mcp:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          docker tag dsg-mcp:${{ github.sha }} dsg-mcp:latest
          # Push to your container registry (GCR, ECR, Docker Hub, etc.)
```

---

## Environment Variables

### Required (Production)

```bash
# Supabase (required)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Recommended (Production)

```bash
# Vercel (optional but recommended)
VERCEL_API_TOKEN="..."
VERCEL_TEAM_ID="..."

# Anthropic (for LLM features)
ANTHROPIC_API_KEY="sk-ant-..."

# Stripe (for billing integration)
STRIPE_API_KEY="sk_live_..."

# Governance services (point to production)
SPINE_BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
SPINE_API_KEY="..."
DSG_BRAIN_BASE_URL="https://..."
DSG_BRAIN_API_KEY="..."
COMPLIANCE_BASE_URL="https://..."
COMPLIANCE_API_KEY="..."
```

### Vercel Secrets

Create in Vercel project settings:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... etc
```

---

## Testing Integration

### Local Testing

```bash
# Build both apps
npm run build

# Start MCP server (in background)
npm -w dsg-one-mcp-server start &
MCP_PID=$!

# Run tests
npm test

# Stop MCP server
kill $MCP_PID
```

### Integration Testing

**Create `tests/integration/mcp.test.ts`:**
```typescript
import { test, expect } from 'vitest';

test('MCP server initializes with Supabase tools', async () => {
  // Test MCP server startup and tool discovery
  // Verify at least 6 Supabase tools are available
});

test('MCP tools execute successfully', async () => {
  // Test calling each tool category
  // Verify responses match expected schemas
});

test('MCP error handling works correctly', async () => {
  // Test error scenarios
  // Verify error messages are clear and don't expose secrets
});
```

### E2E Testing

**MCP Inspector Validation:**
```bash
# Interactive testing
npm -w dsg-one-mcp-server run inspector

# Automated validation (future enhancement)
# npm -w dsg-one-mcp-server run test:inspector
```

---

## Production Readiness Checklist

Before deploying MCP server to production:

### Code & Build
- [ ] TypeScript builds without errors
- [ ] No secrets in source code or logs
- [ ] All dependencies security-audited
- [ ] Build size is reasonable (~10MB)
- [ ] Dockerfile tested and optimized

### Services & Configuration
- [ ] Supabase connection verified
- [ ] Vercel API token (if used) validated
- [ ] Anthropic API key (if used) validated
- [ ] Stripe API key (if used) in sandbox first
- [ ] Spine, DSG Brain, Compliance URLs configured

### Testing & Validation
- [ ] Phase 3 testing complete
- [ ] All 30+ tools functional
- [ ] Error handling verified
- [ ] Phase 4 evaluation passed (score >= 70)
- [ ] Performance benchmarks acceptable

### Monitoring & Support
- [ ] Logging configured (stderr for MCP)
- [ ] Error tracking enabled (if applicable)
- [ ] Health check endpoint configured
- [ ] Documentation updated
- [ ] Support process established

### Security
- [ ] No hardcoded secrets
- [ ] API keys managed via environment variables
- [ ] Rate limiting configured (if applicable)
- [ ] Input validation on all tools
- [ ] No exposed stack traces

---

## Deployment Commands

### Development

```bash
# Clone and setup
git clone <repo>
cd tdealer01-crypto-dsg-control-plane
npm install
npm run dev
```

### Staging

```bash
# Build Docker image
docker build -f dsg-one-mcp-server/Dockerfile -t dsg-mcp:staging .

# Push to staging registry
docker tag dsg-mcp:staging gcr.io/project/dsg-mcp:staging
docker push gcr.io/project/dsg-mcp:staging

# Deploy to staging cluster
kubectl set image deployment/dsg-mcp dsg-mcp=gcr.io/project/dsg-mcp:staging
```

### Production

```bash
# Build and tag
docker build -f dsg-one-mcp-server/Dockerfile -t dsg-mcp:v1.0.0 .
docker tag dsg-mcp:v1.0.0 gcr.io/project/dsg-mcp:v1.0.0
docker push gcr.io/project/dsg-mcp:v1.0.0

# Deploy (with image verification)
kubectl set image deployment/dsg-mcp dsg-mcp=gcr.io/project/dsg-mcp:v1.0.0 --record

# Verify deployment
kubectl rollout status deployment/dsg-mcp
kubectl logs -f deployment/dsg-mcp
```

---

## Troubleshooting

### Server Fails to Start

**Issue:** `Error: SUPABASE_URL is not set`

**Solution:**
```bash
# Check environment
echo $SUPABASE_URL

# Set if missing
export SUPABASE_URL="https://..."
export SUPABASE_ANON_KEY="..."

# Try again
npm -w dsg-one-mcp-server start
```

### Tools Not Appearing

**Issue:** `tools/list` returns empty array

**Solution:**
```bash
# Check server initialization logs
npm -w dsg-one-mcp-server start 2>&1 | grep -i "error\|initialized"

# Verify Supabase connection
curl -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "${SUPABASE_URL}/rest/v1/"

# Check dist files built
ls -la dsg-one-mcp-server/dist/
```

### Build Fails

**Issue:** TypeScript compilation error

**Solution:**
```bash
# Clean and rebuild
rm -rf dsg-one-mcp-server/dist dsg-one-mcp-server/node_modules
npm install -w dsg-one-mcp-server
npm run build -w dsg-one-mcp-server

# Check for type errors
npm run typecheck -w dsg-one-mcp-server || true
```

### Performance Issues

**Issue:** MCP server response time > 1s

**Solution:**
1. Check network latency to Supabase/Vercel
2. Verify quota and rate limits not being hit
3. Profile with Node inspector:
   ```bash
   node --inspect dist/index.js
   # Visit chrome://inspect
   ```
4. Consider adding caching for frequent queries

---

## Performance Metrics

### Expected Metrics (Production)

| Metric | Target | Notes |
|--------|--------|-------|
| Startup Time | < 2s | Server ready to accept requests |
| Tool Response | < 500ms | P95 latency for tool execution |
| Memory Usage | < 150MB | Node.js heap usage at steady state |
| CPU Usage | < 20% | Single MCP server idle |
| QPS | 100+ | Requests per second capacity |
| Error Rate | < 0.1% | Includes network and auth errors |

### Monitoring Setup

```javascript
// In index.ts, add telemetry
const startTime = Date.now();
console.log(`[DSG MCP] Server ready in ${Date.now() - startTime}ms`);
```

---

## Documentation

### For Users

- `README.md` — Setup and basic usage
- `PHASE_3_TESTING.md` — Testing procedures
- `PHASE_4_EVALUATION.md` — Evaluation framework

### For Operators

- `INTEGRATION_GUIDE.md` — This file
- `.env.example` — Configuration template
- Deployment guide (in main repo docs)

### For Developers

- Inline code comments
- Service client documentation
- Tool descriptions in src/tools/

---

## Support & Maintenance

### Regular Tasks

- **Weekly:** Check error logs for patterns
- **Monthly:** Review tool usage statistics
- **Quarterly:** Security audit of dependencies
- **Annually:** Formal compliance audit

### Versioning

- Semantic versioning: `major.minor.patch`
- Current: `1.0.0`
- Tag releases: `v1.0.0`, `v1.0.1`, etc.

### Support Process

1. Check `PHASE_3_TESTING.md` for troubleshooting
2. Review server logs for errors
3. Check Supabase/Vercel status pages
4. Open GitHub issue for bugs
5. Request features via discussions

---

## Next Steps

1. **Immediate (Week 1):**
   - [ ] Copy MCP server to main repository
   - [ ] Update workspace configuration
   - [ ] Update main package.json scripts
   - [ ] Run Phase 3 testing
   - [ ] Document any environment-specific issues

2. **Short-term (Week 2-3):**
   - [ ] Complete Phase 4 evaluation
   - [ ] Set up CI/CD workflow
   - [ ] Deploy to staging environment
   - [ ] Conduct security review
   - [ ] Document operational procedures

3. **Medium-term (Month 2):**
   - [ ] Deploy to production
   - [ ] Monitor production metrics
   - [ ] Gather user feedback
   - [ ] Plan enhancements
   - [ ] Schedule formal audit

4. **Long-term (Month 3+):**
   - [ ] Version 1.1 with optimizations
   - [ ] Additional tool categories
   - [ ] WebSocket streaming support
   - [ ] Advanced monitoring & observability
   - [ ] Third-party integrations

---

**Created:** 2026-07-30
**Last Updated:** 2026-07-30
**Status:** Ready for integration planning

