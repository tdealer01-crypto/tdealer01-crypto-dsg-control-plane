import { DSGConfig } from '../config';

export function validateConfig(config: DSGConfig): void {
  if (!config.aws.account) {
    throw new Error('AWS account ID is required');
  }

  if (!config.aws.region) {
    throw new Error('AWS region is required');
  }

  validateNetworking(config);
  validateCompute(config);
  validateSecurity(config);
  validateGovernance(config);
}

function validateNetworking(config: DSGConfig): void {
  const { networking } = config;

  if (!isValidCIDR(networking.vpcCidr)) {
    throw new Error(`Invalid VPC CIDR: ${networking.vpcCidr}`);
  }

  if (networking.maxAzs < 1 || networking.maxAzs > 4) {
    throw new Error('maxAzs must be between 1 and 4');
  }

  if (networking.natGateways < 0 || networking.natGateways > networking.maxAzs) {
    throw new Error('natGateways must be between 0 and maxAzs');
  }

  if (networking.flowLogsRetentionDays < 1) {
    throw new Error('flowLogsRetentionDays must be at least 1');
  }
}

function validateCompute(config: DSGConfig): void {
  const { compute } = config;

  if (compute.minCapacity > compute.maxCapacity) {
    throw new Error('minCapacity cannot exceed maxCapacity');
  }

  if (compute.desiredCount < compute.minCapacity || compute.desiredCount > compute.maxCapacity) {
    throw new Error('desiredCount must be between minCapacity and maxCapacity');
  }

  if (compute.taskCpu < 256 || ![256, 512, 1024, 2048, 4096].includes(compute.taskCpu)) {
    throw new Error('taskCpu must be one of: 256, 512, 1024, 2048, 4096');
  }

  if (compute.taskMemory < 512) {
    throw new Error('taskMemory must be at least 512');
  }

  if (!['ROLLING', 'BLUE_GREEN', 'CANARY'].includes(compute.deploymentStrategy)) {
    throw new Error('deploymentStrategy must be ROLLING, BLUE_GREEN, or CANARY');
  }
}

function validateSecurity(config: DSGConfig): void {
  const { security } = config;

  if (security.sessionDurationHours < 1) {
    throw new Error('sessionDurationHours must be at least 1');
  }

  if (config.env === 'prod' && !security.mfaRequired) {
    throw new Error('Production environment requires MFA');
  }

  if (config.env === 'prod' && !security.enableShield) {
    throw new Error('Production environment requires AWS Shield');
  }
}

function validateGovernance(config: DSGConfig): void {
  const { governance } = config;

  if (config.compliance.soc2 && governance.auditLogRetentionDays < 365) {
    throw new Error('SOC 2 compliance requires audit log retention of at least 365 days');
  }

  if (config.compliance.iso42001 && !governance.immutableAuditEnabled) {
    throw new Error('ISO 42001 compliance requires immutable audit');
  }

  if (config.env === 'prod' && !governance.immutableAuditEnabled) {
    throw new Error('Production environment requires immutable audit');
  }
}

function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const parts = cidr.split('/');
  const ip = parts[0];
  const mask = parseInt(parts[1], 10);

  if (mask < 0 || mask > 32) {
    return false;
  }

  const ipParts = ip.split('.').map((p) => parseInt(p, 10));
  return ipParts.every((p) => p >= 0 && p <= 255);
}
