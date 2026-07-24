/**
 * DSG ONE Infrastructure Configuration Types
 *
 * Defines all configuration interfaces for AWS CDK deployment
 */

export type EnvironmentType = 'dev' | 'staging' | 'prod';

export interface DSGConfig {
  // Core deployment
  environment: 'dev' | 'staging' | 'prod';
  resourcePrefix: string;

  // AWS Account & Region
  aws: {
    account: string;
    region: string;
    secondaryRegion?: string;
  };

  // Domain & DNS
  domain?: {
    name: string;
    alternateNames?: string[];
  };

  // Networking
  networking: {
    vpcCidr: string;
    enableFlowLogs: boolean;
    enableVpcEndpoints: boolean;
  };

  // ECS Configuration
  ecs: {
    desiredCount: number;
    taskMemory: number;
    taskCpu: number;
    enableAutoScaling: boolean;
    minCapacity: number;
    maxCapacity: number;
  };

  // Database
  database?: {
    engine: 'supabase' | 'rds-aurora' | 'dynamodb';
    backupRetention: number;
    enablePointInTimeRecovery: boolean;
  };

  // WAF Configuration
  waf?: {
    enableWaf: boolean;
    trustedIpRanges: string[];
  };

  // Backup & DR
  backup: {
    enableBackup: boolean;
    retentionDays: number;
    enableCrossRegionReplication: boolean;
  };

  // Notifications
  notifications?: {
    alertEmails: string[];
    incidentEmails: string[];
    slackWebhookUrl?: string;
  };

  // Compliance Frameworks
  compliance: {
    iso42001: boolean;
    nistAiRmf: boolean;
    euAiAct: boolean;
    soc2: boolean;
  };

  // FinOps Configuration
  finops: {
    monthlyBudgetUsd: number;
    enableCostAnomaly: boolean;
    enableReservationRecommendations: boolean;
  };

  // AI Governance
  aiGovernance: {
    enablePolicyEngine: boolean;
    enableDeterministicReplay: boolean;
    enableEvidenceCollection: boolean;
    enableComplianceMapping: boolean;
  };

  // Feature Flags
  featureFlags: {
    enableCanaryDeployments: boolean;
    canaryTrafficPercent: number;
  };

  // Logging & Observability
  logging: {
    cloudWatchRetentionDays: number;
    enableXRay: boolean;
    enableVpcFlowLogs: boolean;
  };

  // Tags
  tags: {
    [key: string]: string;
  };
}

export interface EnvironmentConfig extends DSGConfig {
  // Environment-specific overrides
}
