/**
 * Staging Environment Configuration
 */

import { DSGConfig } from './types';

export const stagingConfig: DSGConfig = {
  environment: 'staging',
  resourcePrefix: 'dsg-one-staging',

  aws: {
    account: process.env.AWS_ACCOUNT_ID || '121205961822',
    region: process.env.AWS_REGION || 'us-east-1',
    secondaryRegion: 'us-west-2',
  },

  domain: {
    name: 'staging.dsg-one.dev',
  },

  networking: {
    vpcCidr: '10.1.0.0/16',
    enableFlowLogs: true,
    enableVpcEndpoints: true,
  },

  ecs: {
    desiredCount: 2,
    taskMemory: 1024,
    taskCpu: 512,
    enableAutoScaling: true,
    minCapacity: 2,
    maxCapacity: 4,
  },

  database: {
    engine: 'dynamodb',
    backupRetention: 30,
    enablePointInTimeRecovery: true,
  },

  waf: {
    enableWaf: true,
    trustedIpRanges: ['10.0.0.0/8'],
  },

  backup: {
    enableBackup: true,
    retentionDays: 30,
    enableCrossRegionReplication: true,
  },

  notifications: {
    alertEmails: ['staging-alerts@dsg.local'],
    incidentEmails: ['incidents@dsg.local'],
  },

  compliance: {
    iso42001: true,
    nistAiRmf: true,
    euAiAct: true,
    soc2: false,
  },

  finops: {
    monthlyBudgetUsd: 5000,
    enableCostAnomaly: true,
    enableReservationRecommendations: true,
  },

  aiGovernance: {
    enablePolicyEngine: true,
    enableDeterministicReplay: true,
    enableEvidenceCollection: true,
    enableComplianceMapping: true,
  },

  bedrock: {
    enableAgentCore: true,
    registryId: process.env.BEDROCK_REGISTRY_ID || 'cGcvetJOMzWh3xmj',
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_ZtxWdHzFJ',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '7njqeoh6bq64s6u44oo9vghfcg',
    mcpServers: [
      {
        name: 'weather-mcp-server',
        description: 'Weather data MCP server',
        version: '1.0.0',
      },
      {
        name: 'dsg-governance-mcp-server',
        description: 'DSG ONE governance and AI control MCP server',
        version: '1.0.0',
      },
    ],
  },

  featureFlags: {
    enableCanaryDeployments: true,
    canaryTrafficPercent: 10,
  },

  logging: {
    cloudWatchRetentionDays: 30,
    enableXRay: true,
    enableVpcFlowLogs: true,
  },

  tags: {
    Environment: 'staging',
    ManagedBy: 'CDK',
    CostCenter: 'Product',
  },
};
