# 🚀 DSG ONE Multi-Cloud Deployment & Revenue Activation Guide

## Quick Start (30 minutes)

### 1. Local Docker Deployment (Development)
```bash
# Start everything locally
docker-compose up -d

# Verify
curl http://localhost:3000/api/health

# Stop
docker-compose down
```

**Cost**: Free (local hardware only)
**Best for**: Development, testing

---

### 2. AWS Deployment (Production-Grade)

#### Prerequisites
```bash
aws --version          # AWS CLI v2
aws configure          # Configure credentials
docker --version       # Docker 20+
```

#### Step-by-Step

**A. Create AWS Infrastructure**
```bash
bash scripts/deploy-aws-setup.sh
```

This creates:
- ECR repository
- VPC & security groups
- ECS cluster
- CloudWatch logs

**B. Build & Push Docker Image**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <YOUR_ECR_URI>

docker build -t dsg-control-plane:latest .
docker tag dsg-control-plane:latest <YOUR_ECR_URI>:latest
docker push <YOUR_ECR_URI>:latest
```

**C. Create ECS Task Definition**
```bash
aws ecs register-task-definition \
  --family dsg-control-plane \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 2048 \
  --memory 4096 \
  --container-definitions '[{
    "name": "dsg",
    "image": "<YOUR_ECR_URI>:latest",
    "portMappings": [{
      "containerPort": 8080,
      "hostPort": 8080,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "8080"}
    ]
  }]'
```

**D. Create ECS Service**
```bash
aws ecs create-service \
  --cluster dsg-production \
  --service-name dsg-api \
  --task-definition dsg-control-plane \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}"
```

**Cost**: $200-500/month at scale
**Uptime**: 99.99% SLA
**Scalability**: Auto-scaling groups (0-100 instances)

---

### 3. Google Cloud Deployment

#### Prerequisites
```bash
gcloud --version         # Google Cloud SDK
gcloud auth login        # Login
gcloud config set project <YOUR_PROJECT>
```

#### Step-by-Step

**A. Enable APIs**
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

**B. Deploy (Automatic)**
```bash
gcloud builds submit --config=cloudbuild.yaml
```

This automatically:
- Builds Docker image
- Pushes to Artifact Registry
- Deploys to Cloud Run
- Runs smoke tests

**C. View Deployment**
```bash
gcloud run services list
gcloud run services describe dsg-control-plane --region=us-central1
```

**Cost**: $150-300/month
**Uptime**: 99.99% SLA
**Setup time**: ~5 minutes

---

### 4. DigitalOcean App Platform (Budget Option)

#### Prerequisites
```bash
doctl auth init        # Install doctl & login
docker-compose --version
```

#### Step-by-Step

**A. Create app.yaml**
```yaml
name: dsg-control-plane
services:
- name: api
  github:
    repo: tdealer01-crypto/tdealer01-crypto-dsg-control-plane
    branch: main
  build_command: npm ci && npm run build
  run_command: npm start
  http_port: 3000
  health_check:
    http_path: /api/health
  envs:
  - key: NODE_ENV
    value: production

databases:
- name: postgres
  version: "16"
```

**B. Deploy**
```bash
doctl apps create --spec app.yaml
```

**Cost**: $50-150/month
**Setup time**: ~3 minutes
**Good for**: MVP, small scale

---

### 5. Self-Hosted (Kubernetes)

#### Prerequisites
```bash
kubectl version          # Kubernetes CLI
docker-compose --version
```

#### Step-by-Step (k3s - lightweight Kubernetes)

**A. Install k3s**
```bash
curl -sfL https://get.k3s.io | sh -
```

**B. Deploy**
```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dsg-control-plane
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dsg
  template:
    metadata:
      labels:
        app: dsg
    spec:
      containers:
      - name: app
        image: dsg-control-plane:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: production
EOF
```

**Cost**: $20-100/month (hardware dependent)
**Best for**: Full control, compliance needs

---

## 💰 Revenue Activation Strategy

### Phase 1: Immediate Revenue (Week 1)
1. **Activate Stripe Billing** ✅
   ```bash
   npm run revenue:setup:hubspot
   npm run revenue:webhook:setup
   ```

2. **Monitor Revenue**
   ```bash
   npm run revenue:dashboard
   ```

3. **Set Up Marketplace**
   - [GitHub Marketplace](https://github.com/marketplace)
   - Zapier integration
   - Make.com automation

### Phase 2: Advanced Revenue (Week 2-3)

#### Tier 1: Subscription Plans
```
Free:       $0/month   (100 API calls)
Pro:        $99/month  (5,000 API calls)
Business:   $299/month (50,000 API calls)
Enterprise: Custom     (Unlimited)
```

#### Tier 2: Pay-as-You-Go
- $0.001 per execution
- $0.01 per proof verification
- $0.001 per token (for LLM usage)

#### Tier 3: Add-ons
- Pro support: +$199/month
- Custom gates: +$1,000/project
- Compliance audit: +$5,000
- SLA guarantee: +$499/month

### Phase 3: Enterprise (Week 4+)

```
Enterprise Package:
- Dedicated support
- Custom SLA (99.99%)
- Custom integration
- Volume discounts
- Training & onboarding

Pricing: $10,000-100,000/year
```

---

## 📊 Revenue Forecasting

### Commands

**Real-time Dashboard**
```bash
npm run revenue:dashboard
```

**Output:**
```
═══════════════════════════════════════════════════════════════
📈 REVENUE METRICS - CURRENT MONTH
═══════════════════════════════════════════════════════════════
MRR (Monthly Recurring Revenue):    $2,450.00
ARR (Annual Recurring Revenue):     $29,400.00
Active Subscriptions:               25
Overage Revenue (30-day):           $340.50
───────────────────────────────────────────────────────────
Total Revenue (30-day):             $2,790.50
═══════════════════════════════════════════════════════════════
```

**Forecast Model** (15% monthly growth)
```bash
npm run revenue:forecast
```

---

## 🔄 Deployment Summary

| Provider | Setup Time | Monthly Cost | Scalability | Best For |
|----------|-----------|-------------|-----------|----------|
| **Docker** | 5 min | $0 | Low | Dev/test |
| **AWS** | 1-2 days | $200-500 | Very High | Production |
| **Google Cloud** | 1 day | $150-300 | Very High | DevOps |
| **DigitalOcean** | 30 min | $50-150 | Medium | MVP |
| **Self-hosted** | 4-8 hrs | $20-100 | High | Compliance |

---

## 🎯 Next Steps

### Immediate (This Week)
- [ ] Choose deployment provider
- [ ] Deploy to staging
- [ ] Run `npm run revenue:dashboard`
- [ ] Test billing workflows

### Short-term (Week 2)
- [ ] Deploy to production
- [ ] Activate Stripe live keys
- [ ] Setup monitoring
- [ ] Create support process

### Long-term (Month 2+)
- [ ] Optimize costs
- [ ] Implement analytics
- [ ] Scale infrastructure
- [ ] Launch marketplace features

---

## 🚨 Troubleshooting

### Docker Compose Issues
```bash
# View logs
docker-compose logs -f app

# Rebuild
docker-compose down
docker-compose up -d --build

# Clean (⚠️ removes data)
docker-compose down -v
```

### AWS Deployment
```bash
# View ECS logs
aws logs tail /ecs/dsg-control-plane --follow

# Check service status
aws ecs describe-services \
  --cluster dsg-production \
  --services dsg-api

# Scale manually
aws ecs update-service \
  --cluster dsg-production \
  --service dsg-api \
  --desired-count 5
```

### Google Cloud
```bash
# View logs
gcloud run logs read dsg-control-plane --region us-central1 --limit 50

# View metrics
gcloud monitoring metrics-descriptors list | grep run

# Update deployment
gcloud run deploy dsg-control-plane --update-env-vars KEY=value
```

---

## 📞 Support

- **Technical Help**: Check logs first
- **Billing Issues**: Check Stripe dashboard
- **Performance**: Monitor metrics with `npm run revenue:dashboard`
- **Scaling**: Consult cloud provider docs

---

*Generated: $(date)*
*DSG ONE Control Plane v2.6.1*
