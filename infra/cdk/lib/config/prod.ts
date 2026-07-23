/**
 * Production Environment Configuration
 */

import { DSGConfig } from './types';

export const prodConfig: DSGConfig = {
  environment: 'prod',
  resourcePrefix: 'dsg-one-prod',

  aws: {
    account: process.env.AWS_ACCOUNT_ID || '345678901234',
    region: process.env.AWS_REGION || 'us-east-1',
    secondaryRegion: 'us-west-2',
  },

  domain: {
    name: 'dsg-one.com',
    alternateNames: ['www.dsg-one.com', 'api.dsg-one.com', 'dashboard.dsg-one.com'],
  },

  networking: {
    vpcCidr: '10.2.0.0/16',
    enableFlowLogs: true,
    enableVpcEndpoints: true,
  },

  ecs: {
    desiredCount: 3,
    taskMemory: 2048,
    taskCpu: 1024,
    enableAutoScaling: true,
    minCapacity: 3,
    maxCapacity: 10,
  },

  database: {
    engine: 'dynamodb',
    backupRetention: 365,
    enablePointInTimeRecovery: true,
  },

  waf: {
    enableWaf: true,
    trustedIpRanges: ['10.0.0.0/8', '203.0.113.0/24'],
  },

  backup: {
    enableBackup: true,
    retentionDays: 365,
    enableCrossRegionReplication: true,
  },

  notifications: {
    alertEmails: ['prod-alerts@dsg.com'],
    incidentEmails: ['incidents@dsg.com', 'on-call@dsg.com'],
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  },

  compliance: {
    iso42001: true,
    nistAiRmf: true,
    euAiAct: true,
    soc2: true,
  },

  finops: {
    monthlyBudgetUsd: 50000,
    enableCostAnomaly: true,
    enableReservationRecommendations: true,
  },

  aiGovernance: {
    enablePolicyEngine: true,
    enableDeterministicReplay: true,
    enableEvidenceCollection: true,
    enableComplianceMapping: true,
  },

  featureFlags: {
    enableCanaryDeployments: true,
    canaryTrafficPercent: 5,
  },

  logging: {
    cloudWatchRetentionDays: 365,
    enableXRay: true,
    enableVpcFlowLogs: true,
  },

  tags: {
    Environment: 'prod',
    ManagedBy: 'CDK',
    CostCenter: 'Operations',
    Compliance: 'Required',
    BackupRequired: 'true',
  },
};
