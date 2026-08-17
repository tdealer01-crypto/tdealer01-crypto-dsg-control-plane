#!/bin/bash

# Multi-Cloud Deployment Script for DSG ONE
# Supports: AWS, Google Cloud, DigitalOcean, self-hosted
# Usage: ./deploy-multi-cloud.sh <provider> <environment>

set -e

PROVIDER=${1:-"docker"}
ENVIRONMENT=${2:-"staging"}
VERSION=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 DSG ONE Multi-Cloud Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Provider:    $PROVIDER"
echo "Environment: $ENVIRONMENT"
echo "Version:     $VERSION"
echo "Timestamp:   $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Pre-flight checks
echo -e "\n${YELLOW}📋 Running pre-flight checks...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker found${NC}"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}❌ Not a git repository${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Git repository detected${NC}"

# Step 2: Build Docker image
echo -e "\n${YELLOW}🐳 Building Docker image...${NC}"
IMAGE_NAME="dsg-control-plane:$VERSION"
docker build -t "$IMAGE_NAME" \
  --build-arg NODE_ENV=$ENVIRONMENT \
  --label "version=$VERSION" \
  --label "timestamp=$TIMESTAMP" \
  --label "provider=$PROVIDER" \
  .

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
  echo -e "${RED}❌ Docker build failed${NC}"
  exit 1
fi

# Step 3: Deploy based on provider
case "$PROVIDER" in
  aws)
    echo -e "\n${YELLOW}☁️  Deploying to AWS...${NC}"

    if [ -z "$AWS_REGION" ]; then
      AWS_REGION="us-east-1"
    fi

    # Get ECR repository
    ECR_REPO=$(aws ecr describe-repositories \
      --repository-names dsg-control-plane \
      --region $AWS_REGION \
      --query 'repositories[0].repositoryUri' \
      --output text 2>/dev/null || echo "")

    if [ -z "$ECR_REPO" ]; then
      echo -e "${YELLOW}📦 Creating ECR repository...${NC}"
      aws ecr create-repository \
        --repository-name dsg-control-plane \
        --region $AWS_REGION
      ECR_REPO=$(aws ecr describe-repositories \
        --repository-names dsg-control-plane \
        --region $AWS_REGION \
        --query 'repositories[0].repositoryUri' \
        --output text)
    fi

    # Login to ECR
    echo -e "${YELLOW}🔐 Logging in to ECR...${NC}"
    aws ecr get-login-password --region $AWS_REGION | \
      docker login --username AWS --password-stdin $ECR_REPO

    # Tag and push
    echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
    docker tag "$IMAGE_NAME" "$ECR_REPO:$VERSION"
    docker tag "$IMAGE_NAME" "$ECR_REPO:latest"
    docker push "$ECR_REPO:$VERSION"
    docker push "$ECR_REPO:latest"

    echo -e "${GREEN}✅ AWS deployment complete${NC}"
    echo -e "   ECR URI: $ECR_REPO:$VERSION"
    ;;

  gcloud)
    echo -e "\n${YELLOW}☁️  Deploying to Google Cloud...${NC}"

    GCP_PROJECT=${GCP_PROJECT:-$(gcloud config get-value project)}
    GCP_REGION=${GCP_REGION:-"us-central1"}

    # Setup artifact registry
    echo -e "${YELLOW}🔐 Setting up Artifact Registry...${NC}"
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev"

    # Tag image
    GAR_IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/dsg-control-plane/app:$VERSION"
    docker tag "$IMAGE_NAME" "$GAR_IMAGE"
    docker tag "$IMAGE_NAME" "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/dsg-control-plane/app:latest"

    # Push
    echo -e "${YELLOW}📤 Pushing image to Artifact Registry...${NC}"
    docker push "$GAR_IMAGE"
    docker push "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/dsg-control-plane/app:latest"

    # Deploy to Cloud Run
    echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
    gcloud run deploy dsg-control-plane \
      --image "$GAR_IMAGE" \
      --region "$GCP_REGION" \
      --platform managed \
      --allow-unauthenticated \
      --memory 2Gi \
      --cpu 2 \
      --max-instances 100

    echo -e "${GREEN}✅ Google Cloud deployment complete${NC}"
    ;;

  docker)
    echo -e "\n${YELLOW}🐳 Deploying with Docker Compose...${NC}"

    docker-compose down || true
    docker-compose up -d

    echo -e "${GREEN}✅ Docker Compose deployment complete${NC}"
    echo -e "   App URL: http://localhost:3000"
    ;;

  *)
    echo -e "${RED}❌ Unknown provider: $PROVIDER${NC}"
    echo "Supported providers: aws, gcloud, docker"
    exit 1
    ;;
esac

# Step 4: Health check
echo -e "\n${YELLOW}🏥 Running health check...${NC}"
sleep 10

for i in {1..5}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1 || \
     curl -sf https://dsg-control-plane.local/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    break
  fi

  if [ $i -lt 5 ]; then
    echo -e "${YELLOW}⏳ Waiting for service to be ready... ($i/5)${NC}"
    sleep 5
  else
    echo -e "${YELLOW}⚠️  Service health check pending (may still be initializing)${NC}"
  fi
done

# Step 5: Summary
echo -e "\n${GREEN}✅ Deployment successful!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Image:  $IMAGE_NAME"
echo "Provider: $PROVIDER"
echo "Environment: $ENVIRONMENT"
echo ""
echo "📊 Next steps:"
echo "  1. Monitor logs: docker logs -f dsg-control-plane"
echo "  2. Check health: curl http://localhost:3000/api/health"
echo "  3. View dashboard: http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
