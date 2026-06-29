# Production WebSocket Deployment Guide

**Phase 3 Implementation: Production WebSocket for Real-time Updates**

---

## Overview

Trinity AI dashboard requires real-time updates for orchestration status, job discovery, and reputation changes. This guide covers deploying the Production WebSocket server alongside the Next.js control plane.

**Architecture**:
- **Next.js App** (Vercel) — REST API & SSE fallback
- **WebSocket Server** (Separate deployment) — Real-time connections & message routing
- **Redis** (Managed service) — Message pub/sub & persistence
- **Client** — Automatic fallback: WebSocket → SSE → Polling

---

## Quick Start (Local Development)

### 1. Prerequisites
```bash
npm install                    # Install dependencies (includes ws and redis)
docker ps                      # Ensure Docker is available
```

### 2. Start WebSocket server with Redis
```bash
# Terminal 1: Start Redis and WebSocket server
docker-compose -f docker-compose.websocket.yml up

# This will:
# - Start Redis on localhost:6379
# - Start WebSocket server on localhost:3001
# - Auto-restart on failure
```

### 3. Start Next.js app
```bash
# Terminal 2: Start Next.js
npm run dev

# Check environment
echo $NEXT_PUBLIC_WEBSOCKET_URL   # Should be ws://localhost:3001
echo $REDIS_URL                   # Should be redis://localhost:6379
```

### 4. Test connection
```bash
# Terminal 3: WebSocket health check
curl http://localhost:3001/health
curl http://localhost:3001/status

# Should return:
# {"status":"ok","timestamp":"2026-06-29T..."}
# {"status":"running","port":3001,"environment":"development","clients":0,...}
```

---

## Environment Variables

### Next.js Application

Add to `.env.local`:

```env
# Production WebSocket URL
# Local: ws://localhost:3001
# Production: wss://websocket.your-domain.com
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Redis for publishing updates from Next.js to WebSocket server
REDIS_URL=redis://localhost:6379

# Enable SSE fallback when WebSocket unavailable
WEBSOCKET_FALLBACK_ENABLED=true
```

### WebSocket Server

Add to `.env` or Docker environment:

```env
NODE_ENV=production          # development or production
WS_PORT=3001               # Port for WebSocket server
REDIS_URL=redis://localhost:6379   # Redis connection
```

---

## Deployment Options

### Option 1: Railway (Recommended)

[Railway.app](https://railway.app) provides simple Docker deployment with Redis managed service.

#### Steps:

1. **Create a Railway project**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Add Redis service**
   - In Railway dashboard: Add "Redis" plugin
   - Copy Redis connection string

3. **Deploy WebSocket server**
   ```bash
   # Create Dockerfile (already in repo: Dockerfile.websocket)
   railway add
   # Select "Docker" option
   
   # Push code
   git push origin feat/phase3-websocket-production
   railway deploy
   ```

4. **Set environment variables in Railway**
   ```
   WS_PORT=3001
   REDIS_URL=<copy from Redis plugin>
   NODE_ENV=production
   ```

5. **Get public URL**
   - Railway dashboard shows public URL
   - Example: `wss://websocket-prod.railway.app`
   - Update Next.js: `NEXT_PUBLIC_WEBSOCKET_URL=wss://websocket-prod.railway.app`

#### Cost: ~$5-10/month with Redis

### Option 2: Render

[Render.com](https://render.com) offers similar deployment with PostgreSQL or Redis.

#### Steps:

1. **Create Web Service**
   - Connect GitHub repo
   - Select Dockerfile: `Dockerfile.websocket`
   - Plan: Paid tier (~$7/month)

2. **Add Redis Database**
   - In Render dashboard: Add "Redis"
   - Copy connection string

3. **Set environment**
   ```
   WS_PORT=3001
   REDIS_URL=<from Redis database>
   NODE_ENV=production
   ```

4. **Deploy**
   - Render auto-deploys on git push
   - Public URL: `https://websocket-prod.onrender.com`
   - WebSocket URL: `wss://websocket-prod.onrender.com`

#### Cost: ~$7-15/month with Redis

### Option 3: AWS ECS + ElastiCache

For high-traffic production:

1. **Create ECS cluster** with Fargate
2. **Push Docker image** to ECR
3. **Create ElastiCache Redis** (at-rest encryption)
4. **Configure security groups** for VPC networking
5. **Set environment variables** in ECS task definition
6. **Use ALB** for load balancing across WebSocket servers

#### Cost: $50-200+/month depending on traffic

### Option 4: Cloudflare Workers (Not Recommended)

Cloudflare Workers support WebSockets but have limitations:
- ❌ Limited connection duration
- ❌ Limited message throughput
- ✅ Cheaper ($0.15/million requests)

Only use if traffic is very low (<100 concurrent connections).

---

## Redis Configuration

### Managed Redis Services

#### Upstash (Recommended for serverless)
- URL: `https://upstash.com`
- Pay-as-you-go model (~$0.2/million commands)
- Auto-scaling
- Zero cold starts

#### AWS ElastiCache
- URL: `https://aws.amazon.com/elasticache/`
- $0.017/hour baseline (~$12/month)
- Suitable for persistent workloads
- Multi-AZ replication for high availability

#### Redis Cloud (Heroku Redis)
- URL: `https://redis.com/try-free/`
- 30MB free tier (development only)
- Auto-scaling up to TB

### Redis Connection String

Format: `redis://[username]:[password]@host:port[/database]`

Examples:
```
# Local
redis://localhost:6379

# Upstash
redis://:your-token@your-upstash-url:port

# ElastiCache (AWS)
redis://your-instance.abc123.ng.0001.usw2.cache.amazonaws.com:6379

# Redis Cloud
redis://:password@hostname:port
```

### Redis Security

**Production checklist**:
- ✅ Require password authentication
- ✅ Enable TLS/SSL encryption
- ✅ Use private networking (VPC, private endpoints)
- ✅ Enable AOF (Append-Only File) persistence
- ✅ Disable dangerous commands (FLUSHALL, KEYS)
- ✅ Monitor with CloudWatch/Datadog

---

## Production Checklist

### Pre-deployment

- [ ] Environment variables configured for production domain
- [ ] Redis password set and TLS enabled
- [ ] WebSocket server tested locally with `npm run dev`
- [ ] Dockerfile builds successfully: `docker build -f Dockerfile.websocket .`
- [ ] Health endpoint accessible: `curl https://ws-server/health`

### Deployment

- [ ] WebSocket server deployed and running
- [ ] Redis accessible from WebSocket server
- [ ] Next.js app updated with production `NEXT_PUBLIC_WEBSOCKET_URL`
- [ ] DNS/load balancer configured
- [ ] TLS certificate valid (for `wss://` URLs)
- [ ] Cross-origin headers configured (CORS)

### Post-deployment

- [ ] Health check passes
- [ ] Status endpoint shows `"clients": 0` initially
- [ ] Open Trinity dashboard and verify WebSocket connects
- [ ] Status bar shows "Connected to Trinity WebSocket"
- [ ] Fallback to SSE works if WebSocket disabled
- [ ] Monitor logs for errors
- [ ] Set up alerts for connection drops

---

## Monitoring & Troubleshooting

### Health Checks

```bash
# HTTP status endpoint
curl https://websocket.your-domain.com/health

# WebSocket server status
curl https://websocket.your-domain.com/status

# Should return:
#{
#  "status": "running",
#  "port": 3001,
#  "environment": "production",
#  "clients": 42,
#  "timestamp": "2026-06-29T15:30:00Z"
#}
```

### Common Issues

#### 1. WebSocket connection times out

**Symptom**: Browser console shows `WebSocket connection refused`

**Solution**:
- Check if WebSocket server is running: `curl http://server:3001/health`
- Verify firewall allows port 3001 (or 443 for wss://)
- Check `NEXT_PUBLIC_WEBSOCKET_URL` matches deployment
- Verify TLS certificate is valid (for wss://)

#### 2. Messages don't reach clients

**Symptom**: No real-time updates in dashboard, but no errors

**Solution**:
- Check Redis connectivity: `redis-cli -u $REDIS_URL PING`
- Verify channels are being published: `redis-cli -u $REDIS_URL SUBSCRIBE 'trinity:*'`
- Check server logs for publish errors
- Ensure client subscribed to correct channel

#### 3. High latency (>500ms)

**Symptom**: Real-time updates are slow

**Solution**:
- Check network latency: `ping websocket.your-domain.com`
- Monitor Redis latency: `redis-cli --latency`
- Check server CPU/memory usage
- Consider horizontal scaling (load balancer)

#### 4. Memory leaks

**Symptom**: WebSocket server memory usage increases over time

**Solution**:
- Check for unsubscribed handlers in client code
- Verify clients disconnect properly on page unload
- Monitor Redis memory: `redis-cli INFO memory`
- Restart WebSocket server if memory critical

### Logs

**WebSocket server logs**:
```bash
# Docker logs
docker logs trinity-websocket

# Railway
railway logs

# Render
render logs

# Watch real-time
tail -f logs/websocket.log
```

**Redis logs**:
```bash
# Docker
docker logs trinity-redis

# Command-line
redis-cli MONITOR
```

---

## Performance Tuning

### Horizontal Scaling

For >10,000 concurrent connections:

1. **Deploy multiple WebSocket servers**
   ```
   WebSocket Server 1 ──┐
   WebSocket Server 2 ──┼─── Load Balancer ──── Clients
   WebSocket Server 3 ──┘
   ```

2. **Use message queue** (Redis pub/sub handles this automatically)

3. **Configure Nginx/HAProxy** for sticky sessions:
   ```nginx
   upstream websocket_backend {
       server ws1.example.com:3001;
       server ws2.example.com:3001;
       server ws3.example.com:3001;
   }

   server {
       listen 443 ssl http2;
       location /ws {
           proxy_pass http://websocket_backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

### Connection Pooling

WebSocket server uses optimized connection handling:
- Max 10,000 connections per process
- Automatic cleanup on disconnect
- Heartbeat every 30 seconds

Adjust in `lib/websocket/server.ts`:
```typescript
const heartbeat = setInterval(() => { ... }, 30000);  // Change to 60000 for lower bandwidth
```

### Message Batching

For high-frequency updates, batch messages:

```typescript
// Before: Every update sends a message
await publishOrchestrationUpdate({...});
await publishOrchestrationUpdate({...});
await publishOrchestrationUpdate({...});

// After: Batch multiple updates
await publishToChannel('trinity:orchestration', {
  type: 'batch-update',
  updates: [
    {...},
    {...},
    {...},
  ]
});
```

---

## Cost Breakdown

### Per-month estimate (1000 concurrent connections):

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| WebSocket | Railway | ~$7 | Incl. bandwidth |
| Redis | Railway | ~$3 | 100GB storage |
| **Total** | | **~$10/mo** | |

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| WebSocket | AWS ECS | ~$30 | t3.small, 1 instance |
| Redis | ElastiCache | ~$15 | cache.t3.small |
| Data Transfer | AWS | ~$5 | Out-of-region |
| **Total** | | **~$50/mo** | |

---

## Next Steps

1. **Choose deployment** (Railway recommended for simplicity)
2. **Set up Redis** (Upstash or managed service)
3. **Deploy WebSocket server** following chosen option
4. **Update `NEXT_PUBLIC_WEBSOCKET_URL`** in Vercel project settings
5. **Test connection** from Trinity dashboard
6. **Monitor logs** for first 24 hours
7. **Set up alerting** for connection issues

See `docs/PHASE_3_PLAN.md` for overall Phase 3 roadmap.
