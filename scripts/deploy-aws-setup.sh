#!/bin/bash
# AWS Deployment Setup for DSG ONE Control Plane
# Prepares ECR, VPC, RDS, ECS infrastructure

set -e

AWS_REGION=${AWS_REGION:-"us-east-1"}
ECR_REPO_NAME="dsg-control-plane"
CLUSTER_NAME="dsg-production"
SERVICE_NAME="dsg-api"
TASK_NAME="dsg-task"

echo "🚀 Starting AWS infrastructure setup for DSG ONE..."

# 1. Create ECR repository
echo "📦 Creating ECR repository..."
aws ecr create-repository \
  --repository-name ${ECR_REPO_NAME} \
  --region ${AWS_REGION} \
  --image-scan-on-push \
  || echo "ECR repo already exists"

# Get ECR URI
ECR_URI=$(aws ecr describe-repositories \
  --repository-names ${ECR_REPO_NAME} \
  --region ${AWS_REGION} \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "✅ ECR URI: $ECR_URI"

# 2. Create VPC (optional - use default if not preferred)
echo "🌐 Using default VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --region ${AWS_REGION} \
  --query 'Vpcs[0].VpcId' \
  --output text)

echo "✅ VPC ID: $VPC_ID"

# 3. Create security group for ECS
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name dsg-ecs-sg \
  --description "DSG Control Plane ECS security group" \
  --vpc-id ${VPC_ID} \
  --region ${AWS_REGION} \
  --query 'GroupId' \
  --output text) || \
  SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=dsg-ecs-sg" \
    --region ${AWS_REGION} \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "✅ Security Group: $SG_ID"

# 4. Allow inbound traffic (port 3000)
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region ${AWS_REGION} \
  || echo "Rule already exists"

# 5. Create CloudWatch log group
echo "📝 Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name /ecs/dsg-control-plane \
  --region ${AWS_REGION} \
  || echo "Log group already exists"

# 6. Create ECS cluster
echo "🎯 Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name ${CLUSTER_NAME} \
  --region ${AWS_REGION} \
  || echo "Cluster already exists"

echo ""
echo "✅ AWS infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Build and push Docker image:"
echo "   docker build -t ${ECR_URI}:latest ."
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI%/*}"
echo "   docker push ${ECR_URI}:latest"
echo ""
echo "2. Create RDS PostgreSQL instance (manual or via AWS CLI)"
echo "3. Create IAM role for ECS task execution"
echo "4. Create ECS task definition and service"
echo "5. Configure load balancer and auto-scaling"
echo ""
echo "Environment variables to save:"
echo "AWS_REGION=${AWS_REGION}"
echo "ECR_URI=${ECR_URI}"
echo "CLUSTER_NAME=${CLUSTER_NAME}"
echo "VPC_ID=${VPC_ID}"
echo "SG_ID=${SG_ID}"
