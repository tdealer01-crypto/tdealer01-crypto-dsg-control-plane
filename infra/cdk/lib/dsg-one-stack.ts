import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from './config';
import {
  // Phase 1: Foundation
  NetworkingConstruct,
  IAMConstruct,
  KMSConstruct,
  SecretsConstruct,
  ECRConstruct,
  GovernanceConstruct,
  // Phase 2: Compute & Observability
  ALBConstruct,
  ECSConstruct,
  CloudWatchConstruct,
  CloudTrailConstruct,
  XRayConstruct,
  AutoScalingConstruct,
  // Phase 3: AI Governance
  PolicyEngineConstruct,
  ModelRegistryConstruct,
  AuditConstruct,
  ReplayConstruct,
  EvidenceConstruct,
  ComplianceConstruct,
  FeatureFlagsConstruct,
  // Phase 4: Security & Operations
  Route53Construct,
  ACMConstruct,
  GuardDutyConstruct,
  SecurityHubConstruct,
  WAFConstruct,
  ShieldConstruct,
  InspectorConstruct,
  BackupConstruct,
  SNSConstruct,
  FinOpsConstruct,
  MultiRegionConstruct,
} from './constructs';
import { validateConfig } from './utils';

export interface DSGOneStackProps extends cdk.StackProps {
  config: DSGConfig;
}

/**
 * DSG ONE Stack - Complete Infrastructure as Code
 *
 * Enterprise-grade AI Governance Control Plane with:
 * - Phase 1: Foundation (Networking, IAM, KMS, Secrets, ECR)
 * - Phase 2: Compute & Observability (ECS, ALB, CloudWatch, X-Ray)
 * - Phase 3: AI Governance (Policy Engine, Model Registry, Audit, Replay, Evidence, Compliance)
 * - Phase 4: Security & Operations (DNS, SSL, GuardDuty, WAF, Backup, FinOps)
 */
export class DSGOneStack extends cdk.Stack {
  // Phase 1: Foundation
  public readonly kms: KMSConstruct;
  public readonly iam: IAMConstruct;
  public readonly secrets: SecretsConstruct;
  public readonly networking: NetworkingConstruct;
  public readonly ecr: ECRConstruct;
  public readonly governance: GovernanceConstruct;

  // Phase 2: Compute & Observability
  public readonly alb: ALBConstruct;
  public readonly ecs: ECSConstruct;
  public readonly cloudwatch: CloudWatchConstruct;
  public readonly cloudtrail: CloudTrailConstruct;
  public readonly xray: XRayConstruct;
  public readonly autoscaling: AutoScalingConstruct;

  // Phase 3: AI Governance
  public readonly policyEngine: PolicyEngineConstruct;
  public readonly modelRegistry: ModelRegistryConstruct;
  public readonly audit: AuditConstruct;
  public readonly replay: ReplayConstruct;
  public readonly evidence: EvidenceConstruct;
  public readonly compliance: ComplianceConstruct;
  public readonly featureFlags: FeatureFlagsConstruct;

  // Phase 4: Security & Operations
  public readonly route53: Route53Construct;
  public readonly acm: ACMConstruct;
  public readonly guardduty: GuardDutyConstruct;
  public readonly securityhub: SecurityHubConstruct;
  public readonly waf: WAFConstruct;
  public readonly shield: ShieldConstruct;
  public readonly inspector: InspectorConstruct;
  public readonly backup: BackupConstruct;
  public readonly sns: SNSConstruct;
  public readonly finops: FinOpsConstruct;
  public readonly multiregion: MultiRegionConstruct;

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

    console.log(`🚀 Deploying DSG ONE infrastructure to ${config.environment}...`);

    // ============================================
    // Phase 1: Foundation (Dependency Order)
    // ============================================
    console.log('📦 Phase 1: Creating foundation constructs...');

    // 1. KMS keys (needed by all)
    this.kms = new KMSConstruct(this, 'KMS', { config });

    // 2. IAM roles (needed by services)
    this.iam = new IAMConstruct(this, 'IAM', { config });

    // 3. Secrets (needs KMS)
    this.secrets = new SecretsConstruct(this, 'Secrets', {
      config,
    });

    // 4. Networking (independent)
    this.networking = new NetworkingConstruct(this, 'Networking', { config });

    // 5. Container Registry
    this.ecr = new ECRConstruct(this, 'ECR', { config });

    // 6. Governance foundation
    this.governance = new GovernanceConstruct(this, 'Governance', {
      config,
    });

    // ============================================
    // Phase 2: Compute & Observability
    // ============================================
    console.log('🖥️ Phase 2: Creating compute and observability constructs...');

    // Load Balancer
    this.alb = new ALBConstruct(this, 'ALB', {
      config,
      vpc: this.networking.vpc,
    });

    // ECS Cluster & Services
    this.ecs = new ECSConstruct(this, 'ECS', {
      config,
      vpc: this.networking.vpc,
      ecr: this.ecr,
      alb: this.alb,
      secrets: this.secrets,
    });

    // CloudWatch Monitoring
    this.cloudwatch = new CloudWatchConstruct(this, 'CloudWatch', {
      config,
    });

    // CloudTrail Audit Logging
    this.cloudtrail = new CloudTrailConstruct(this, 'CloudTrail', {
      config,
    });

    // X-Ray Distributed Tracing
    this.xray = new XRayConstruct(this, 'XRay', { config });

    // Auto Scaling
    this.autoscaling = new AutoScalingConstruct(this, 'AutoScaling', {
      config,
    });

    // ============================================
    // Phase 3: AI Governance Layer
    // ============================================
    console.log('🤖 Phase 3: Creating AI governance constructs...');

    // Policy Engine
    this.policyEngine = new PolicyEngineConstruct(this, 'PolicyEngine', {
      config,
    });

    // Model Registry
    this.modelRegistry = new ModelRegistryConstruct(this, 'ModelRegistry', {
      config,
    });

    // Advanced Audit Trail (Immutable)
    this.audit = new AuditConstruct(this, 'Audit', {
      config,
    });

    // Deterministic Replay
    this.replay = new ReplayConstruct(this, 'Replay', {
      config,
    });

    // Evidence Collection (CCVS L1-L5)
    this.evidence = new EvidenceConstruct(this, 'Evidence', {
      config,
    });

    // Compliance & Policy as Code
    this.compliance = new ComplianceConstruct(this, 'Compliance', {
      config,
    });

    // Feature Flags & Runtime Gating
    this.featureFlags = new FeatureFlagsConstruct(this, 'FeatureFlags', {
      config,
    });

    // ============================================
    // Phase 4: Security & Operations
    // ============================================
    console.log('🔒 Phase 4: Creating security and operations constructs...');

    // DNS Management
    this.route53 = new Route53Construct(this, 'Route53', { config });

    // SSL/TLS Certificates
    this.acm = new ACMConstruct(this, 'ACM', {
      config,
      hostedZone: this.route53.hostedZone,
    });

    // GuardDuty Threat Detection
    this.guardduty = new GuardDutyConstruct(this, 'GuardDuty', {
      config,
      snsTopic: undefined, // Will be wired from SNS construct
    });

    // Security Hub
    this.securityhub = new SecurityHubConstruct(this, 'SecurityHub', { config });

    // Web Application Firewall
    this.waf = new WAFConstruct(this, 'WAF', { config });

    // DDoS Protection
    this.shield = new ShieldConstruct(this, 'Shield', { config });

    // Vulnerability Scanner
    this.inspector = new InspectorConstruct(this, 'Inspector', { config });

    // Backup & Disaster Recovery
    this.backup = new BackupConstruct(this, 'Backup', { config });

    // Notifications
    this.sns = new SNSConstruct(this, 'SNS', {
      config,
    });

    // FinOps - Cost Management
    this.finops = new FinOpsConstruct(this, 'FinOps', {
      config,
      snsTopicArn: this.sns.billingTopic.topicArn,
    });

    // Multi-Region Orchestration
    this.multiregion = new MultiRegionConstruct(this, 'MultiRegion', { config });

    // ============================================
    // Stack Outputs
    // ============================================
    this.createOutputs();

    console.log('✅ DSG ONE stack definition complete!');
  }

  private createOutputs() {
    // Core infrastructure outputs
    new cdk.CfnOutput(this, 'ALBDnsName', {
      description: 'Application Load Balancer DNS Name',
      value: this.alb.alb.loadBalancerDnsName,
      exportName: `${this.stackName}-alb-dns`,
    });

    new cdk.CfnOutput(this, 'ECSClusterName', {
      description: 'ECS Cluster Name',
      value: this.ecs.cluster.clusterName,
      exportName: `${this.stackName}-ecs-cluster`,
    });

    new cdk.CfnOutput(this, 'KMSKeyId', {
      description: 'KMS Master Key ID',
      value: this.kms.key.keyId,
      exportName: `${this.stackName}-kms-key`,
    });

    // AI Governance outputs
    new cdk.CfnOutput(this, 'PolicyEngineTableName', {
      description: 'Policy Engine DynamoDB Table',
      value: this.policyEngine.policiesTable.tableName,
      exportName: `${this.stackName}-policy-table`,
    });

    new cdk.CfnOutput(this, 'AuditTableName', {
      description: 'Immutable Audit Trail Table',
      value: this.audit.auditTable.tableName,
      exportName: `${this.stackName}-audit-table`,
    });

    new cdk.CfnOutput(this, 'DeploymentEnvironment', {
      description: 'Deployment Environment',
      value: this.node.metadata.find((m) => m.type === 'Environment')?.data ||
        'production',
      exportName: `${this.stackName}-environment`,
    });

    new cdk.CfnOutput(this, 'MultiRegionStrategy', {
      description: 'Multi-Region Replication Strategy',
      value: this.multiregion.replicationStrategy,
      exportName: `${this.stackName}-replication`,
    });
  }
}
