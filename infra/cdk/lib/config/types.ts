export interface DSGConfig {
  env: EnvironmentType;
  aws: {
    account: string;
    region: string;
    secondaryRegion?: string;
  };
  tags: Record<string, string>;
  networking: NetworkingConfig;
  compute: ComputeConfig;
  security: SecurityConfig;
  observability: ObservabilityConfig;
  governance: GovernanceConfig;
  compliance: ComplianceConfig;
  finops: FinOpsConfig;
  features: FeaturesConfig;
}

export type EnvironmentType = 'dev' | 'staging' | 'prod';

export interface NetworkingConfig {
  vpcCidr: string;
  maxAzs: number;
  natGateways: number;
  enableFlowLogs: boolean;
  flowLogsRetentionDays: number;
}

export interface ComputeConfig {
  ecs: {
    enableExecuteCommand: boolean;
    enableContainerInsights: boolean;
  };
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  taskCpu: number;
  taskMemory: number;
  enableAutoScaling: boolean;
  deploymentStrategy: 'ROLLING' | 'BLUE_GREEN' | 'CANARY';
}

export interface SecurityConfig {
  kmsKeyRotation: boolean;
  enableWaf: boolean;
  enableShield: boolean;
  enableGuardDuty: boolean;
  enableSecurityHub: boolean;
  enableInspector: boolean;
  mfaRequired: boolean;
  sessionDurationHours: number;
}

export interface ObservabilityConfig {
  cloudWatchRetentionDays: number;
  enableXRay: boolean;
  enableCloudTrail: boolean;
  cloudTrailRetentionDays: number;
  enableDetailedMonitoring: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface GovernanceConfig {
  policyEngineEnabled: boolean;
  approvalRequired: boolean;
  replayProofRequired: boolean;
  evidenceRetentionDays: number;
  auditLogRetentionDays: number;
  immutableAuditEnabled: boolean;
}

export interface ComplianceConfig {
  iso42001: boolean;
  nistAiRmf: boolean;
  euAiAct: boolean;
  soc2: boolean;
  complianceReportingEnabled: boolean;
  policyAsCodeEnabled: boolean;
}

export interface FinOpsConfig {
  budgetAlertThreshold: number;
  enableCostAnomaly: boolean;
  enableComputeOptimizer: boolean;
  enableRightsizing: boolean;
  savingsPlans: boolean;
}

export interface FeaturesConfig {
  multiRegion: boolean;
  multiTenant: boolean;
  featureFlagsEnabled: boolean;
  canaryDeployments: boolean;
  blueGreenDeployments: boolean;
  workspaceIsolation: boolean;
}
