/**
 * Development Environment Configuration
 */

import { DSGConfig } from './types';

export const devConfig: DSGConfig = {
  environment: 'dev',
  resourcePrefix: 'dsg-one-dev',

  aws: {
    account: process.env.AWS_ACCOUNT_ID || '123456789012',
    region: process.env.AWS_REGION || 'us-east-1',
    secondaryRegion: 'us-west-2',
  },

  domain: {
    name: 'dev.dsg-one.local',
  },

  networking: {
    vpcCidr: '10.0.0.0/16',
    enableFlowLogs: true,
    enableVpcEndpoints: false,
  },

  ecs: {
    desiredCount: 1,
    taskMemory: 512,
    taskCpu: 256,
    enableAutoScaling: false,
    minCapacity: 1,
    maxCapacity: 2,
  },

  database: {
    engine: 'dynamodb',
    backupRetention: 7,
    enablePointInTimeRecovery: true,
  },

  waf: {
    enableWaf: false,
    trustedIpRanges: ['0.0.0.0/0'],
  },

  backup: {
    enableBackup: true,
    retentionDays: 7,
    enableCrossRegionReplication: false,
  },

  notifications: {
    alertEmails: ['dev-alerts@dsg.local'],
    incidentEmails: [],
  },

  compliance: {
    iso42001: false,
    nistAiRmf: false,
    euAiAct: false,
    soc2: false,
  },

  finops: {
    monthlyBudgetUsd: 1000,
    enableCostAnomaly: false,
    enableReservationRecommendations: false,
  },

  aiGovernance: {
    enablePolicyEngine: true,
    enableDeterministicReplay: true,
    enableEvidenceCollection: false,
    enableComplianceMapping: false,
  },

  featureFlags: {
    enableCanaryDeployments: false,
    canaryTrafficPercent: 0,
  },

  logging: {
    cloudWatchRetentionDays: 7,
    enableXRay: false,
    enableVpcFlowLogs: true,
  },

  tags: {
    Environment: 'dev',
    ManagedBy: 'CDK',
    CostCenter: 'Engineering',
  },
};
