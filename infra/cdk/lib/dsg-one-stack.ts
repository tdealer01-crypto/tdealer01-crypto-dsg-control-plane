import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from './config';
import {
  NetworkingConstruct,
  IAMConstruct,
  KMSConstruct,
  SecretsConstruct,
  ECRConstruct,
  GovernanceConstruct,
  ALBConstruct,
  ECSConstruct,
  CloudWatchConstruct,
  CloudTrailConstruct,
  XRayConstruct,
  AutoScalingConstruct,
} from './constructs';
import { validateConfig } from './utils';

export interface DSGOneStackProps extends cdk.StackProps {
  config: DSGConfig;
}

export class DSGOneStack extends cdk.Stack {
  // Phase 1: Foundation
  public readonly networking: NetworkingConstruct;
  public readonly iam: IAMConstruct;
  public readonly kms: KMSConstruct;
  public readonly secrets: SecretsConstruct;
  public readonly ecr: ECRConstruct;
  public readonly governance: GovernanceConstruct;

  // Phase 2: Compute and Observability
  public readonly alb: ALBConstruct;
  public readonly ecs: ECSConstruct;
  public readonly cloudwatch: CloudWatchConstruct;
  public readonly cloudtrail: CloudTrailConstruct;
  public readonly xray: XRayConstruct;

  // Phase 3: Advanced Features
  public readonly autoscaling?: AutoScalingConstruct;

  constructor(scope: Construct, id: string, props: DSGOneStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.config.aws.account,
        region: props.config.aws.region,
      },
    });

    const { config } = props;

    // Validate configuration before proceeding
    validateConfig(config);

    // Apply tags to entire stack
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });

    // Initialize constructs in dependency order
    // Phase 1: Foundation (in order of dependencies)
    // 1. Encryption keys first (needed by other constructs)
    this.kms = new KMSConstruct(this, 'KMS', { config });

    // 2. IAM roles (needed for services)
    this.iam = new IAMConstruct(this, 'IAM', { config });

    // 3. Secrets (needs KMS key)
    this.secrets = new SecretsConstruct(this, 'Secrets', {
      config,
      encryptionKey: this.kms.masterKey,
    });

    // 4. Networking infrastructure
    this.networking = new NetworkingConstruct(this, 'Networking', { config });

    // 5. Container registry
    this.ecr = new ECRConstruct(this, 'ECR', { config });

    // 6. Governance systems (policy engine, audit trail, evidence)
    this.governance = new GovernanceConstruct(this, 'Governance', {
      config,
      encryptionKey: this.kms.auditKey,
    });

    // Phase 2: Compute and Observability
    // 7. Load Balancer
    this.alb = new ALBConstruct(this, 'ALB', {
      config,
      vpc: this.networking.vpc,
      securityGroup: this.networking.albSecurityGroup,
    });

    // 8. ECS Cluster and Service
    this.ecs = new ECSConstruct(this, 'ECS', {
      config,
      vpc: this.networking.vpc,
      ecsSecurityGroup: this.networking.ecsSecurityGroup,
      taskExecutionRole: this.iam.ecsTaskExecutionRole,
      taskRole: this.iam.ecsTaskRole,
      apiRepository: this.ecr.apiRepository,
      alb: this.alb.alb,
      targetGroup: this.alb.targetGroup,
    });

    // 9. Monitoring (CloudWatch dashboards and alarms)
    this.cloudwatch = new CloudWatchConstruct(this, 'CloudWatch', {
      config,
      alb: this.alb.alb,
      service: this.ecs.service,
      targetGroup: this.alb.targetGroup,
    });

    // 10. Audit logging (CloudTrail)
    this.cloudtrail = new CloudTrailConstruct(this, 'CloudTrail', {
      config,
      encryptionKey: this.kms.auditKey,
    });

    // 11. Distributed tracing (X-Ray)
    this.xray = new XRayConstruct(this, 'XRay', {
      config,
      taskRole: this.iam.ecsTaskRole,
    });

    // Phase 3: Advanced Features
    // 12. Auto-scaling (target tracking policies)
    if (config.compute.enableAutoScaling) {
      this.autoscaling = new AutoScalingConstruct(this, 'AutoScaling', {
        config,
        ecsService: this.ecs.service,
        targetGroup: this.alb.targetGroup,
      });
    }

    // Outputs
    this.createOutputs(config);
  }

  private createOutputs(config: DSGConfig): void {
    // Environment
    new cdk.CfnOutput(this, 'EnvironmentOutput', {
      value: config.env,
      description: 'Deployment environment',
    });

    // Phase 1 Outputs
    new cdk.CfnOutput(this, 'VPCIdOutput', {
      value: this.networking.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'APIRepositoryURI', {
      value: this.ecr.apiRepository.repositoryUri,
      description: 'ECR API Repository URI',
    });

    new cdk.CfnOutput(this, 'EvidenceBucketName', {
      value: this.governance.evidenceBucket.bucketName,
      description: 'S3 bucket for compliance evidence',
    });

    new cdk.CfnOutput(this, 'AuditTableName', {
      value: this.governance.auditTable.tableName,
      description: 'DynamoDB table for audit trail',
    });

    // Phase 2 Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.alb.alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
    });

    new cdk.CfnOutput(this, 'ECSClusterName', {
      value: this.ecs.cluster.clusterName,
      description: 'ECS Cluster name',
    });

    new cdk.CfnOutput(this, 'ECSServiceName', {
      value: this.ecs.service.serviceName,
      description: 'ECS Service name',
    });

    new cdk.CfnOutput(this, 'CloudWatchDashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.cloudwatch.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'CloudTrailBucketName', {
      value: this.cloudtrail.bucket.bucketName,
      description: 'S3 bucket for CloudTrail logs',
    });

    // Phase 3 Outputs
    if (config.compute.enableAutoScaling) {
      new cdk.CfnOutput(this, 'AutoScalingTargetMinCapacity', {
        value: (config.compute.minCapacity || 2).toString(),
        description: 'Auto-scaling minimum task count',
      });

      new cdk.CfnOutput(this, 'AutoScalingTargetMaxCapacity', {
        value: (config.compute.maxCapacity || 10).toString(),
        description: 'Auto-scaling maximum task count',
      });

      new cdk.CfnOutput(this, 'AutoScalingCPUTarget', {
        value: config.env === 'prod' ? '60%' : '70%',
        description: 'CPU utilization target for auto-scaling',
      });
    }
  }
}
