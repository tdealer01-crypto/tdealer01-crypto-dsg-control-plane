/**
 * Configuration Validation Utilities
 */

import { DSGConfig } from '../config/types';

export function validateConfig(config: DSGConfig): void {
  const errors: string[] = [];

  // Validate environment
  if (!['dev', 'staging', 'prod'].includes(config.environment)) {
    errors.push('Environment must be dev, staging, or prod');
  }

  // Validate AWS Account & Region
  if (!config.aws.account || config.aws.account.length !== 12) {
    errors.push('AWS account must be a 12-digit number');
  }

  if (!config.aws.region) {
    errors.push('AWS region is required');
  }

  // Validate resource prefix
  if (!config.resourcePrefix || !/^[a-z][a-z0-9-]*$/.test(config.resourcePrefix)) {
    errors.push(
      'Resource prefix must start with lowercase letter and contain only lowercase letters, numbers, and hyphens'
    );
  }

  // Validate networking
  if (!isValidCidr(config.networking.vpcCidr)) {
    errors.push('VPC CIDR must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)');
  }

  // Validate ECS
  if (config.ecs.desiredCount < 1) {
    errors.push('ECS desired count must be >= 1');
  }

  if (config.ecs.taskMemory < 256) {
    errors.push('ECS task memory must be >= 256 MB');
  }

  if (config.ecs.taskCpu < 256) {
    errors.push('ECS task CPU must be >= 256');
  }

  // Validate Backup
  if (config.backup.retentionDays < 7) {
    errors.push('Backup retention must be >= 7 days');
  }

  // Production-specific validations
  if (config.environment === 'prod') {
    if (config.ecs.desiredCount < 2) {
      errors.push('Production must have at least 2 ECS tasks for HA');
    }

    if (!config.backup.enableBackup) {
      errors.push('Production must have backups enabled');
    }

    if (!config.compliance.soc2) {
      errors.push('Production should have SOC 2 compliance enabled');
    }

    if (config.finops.monthlyBudgetUsd < 1000) {
      errors.push('Production monthly budget should be >= $1000');
    }
  }

  // Domain validation (if configured)
  if (config.domain?.name) {
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/.test(config.domain.name)) {
      errors.push('Domain name must be a valid domain');
    }
  }

  // Throw if there are validation errors
  if (errors.length > 0) {
    const errorMsg = `Configuration validation failed:\n  - ${errors.join('\n  - ')}`;
    throw new Error(errorMsg);
  }

  console.log(`✅ Configuration validated for ${config.environment} environment`);
}

function isValidCidr(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const [ip, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr, 10);

  if (mask < 1 || mask > 32) {
    return false;
  }

  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return parts.every((p) => p >= 0 && p <= 255);
}
