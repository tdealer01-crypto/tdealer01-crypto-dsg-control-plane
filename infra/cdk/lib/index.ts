export { getConfig, DSGConfig, EnvironmentType } from './config';
export * from './config/types';
export * from './utils';

import { DSGConfig } from './config/types';

// Validation function
export function validateConfig(config: DSGConfig): void {
  // Validate VPC CIDR
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(config.networking.vpcCidr)) {
    throw new Error('Invalid VPC CIDR');
  }

  // Validate task CPU (valid ECS Fargate values)
  const validCpuValues = [256, 512, 1024, 2048, 4096];
  if (!validCpuValues.includes(config.compute.taskCpu)) {
    throw new Error(`taskCpu must be one of: ${validCpuValues.join(', ')}`);
  }

  // Validate capacity
  if (config.compute.minCapacity > config.compute.maxCapacity) {
    throw new Error('minCapacity cannot exceed maxCapacity');
  }

  // Production environment requirements
  if (config.env === 'prod') {
    if (!config.security.mfaRequired) {
      throw new Error('Production environment requires MFA');
    }
    if (!config.security.enableShield) {
      throw new Error('Production environment requires AWS Shield');
    }
  }
}
