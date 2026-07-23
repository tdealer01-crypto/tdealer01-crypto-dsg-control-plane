import { describe, it, expect } from 'vitest';
import { getConfig, validateConfig } from '../lib';

describe('Configuration', () => {
  it('should load dev configuration', () => {
    const config = getConfig('dev');
    expect(config.env).toBe('dev');
    expect(config.compute.desiredCount).toBe(1);
  });

  it('should load staging configuration', () => {
    const config = getConfig('staging');
    expect(config.env).toBe('staging');
    expect(config.compute.desiredCount).toBe(2);
    expect(config.features.multiRegion).toBe(true);
  });

  it('should load prod configuration', () => {
    const config = getConfig('prod');
    expect(config.env).toBe('prod');
    expect(config.compute.desiredCount).toBe(3);
    expect(config.security.mfaRequired).toBe(true);
    expect(config.security.enableShield).toBe(true);
  });

  it('should validate dev config successfully', () => {
    const config = getConfig('dev');
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('should validate staging config successfully', () => {
    const config = getConfig('staging');
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('should validate prod config successfully', () => {
    const config = getConfig('prod');
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('should throw on unknown environment', () => {
    expect(() => getConfig('unknown' as any)).toThrow('Unknown environment');
  });

  it('should reject invalid CIDR blocks', () => {
    const config = getConfig('dev');
    config.networking.vpcCidr = 'invalid-cidr';
    expect(() => validateConfig(config)).toThrow('Invalid VPC CIDR');
  });

  it('should reject invalid task CPU', () => {
    const config = getConfig('dev');
    config.compute.taskCpu = 123;
    expect(() => validateConfig(config)).toThrow('taskCpu must be one of');
  });

  it('should reject minCapacity > maxCapacity', () => {
    const config = getConfig('dev');
    config.compute.minCapacity = 5;
    config.compute.maxCapacity = 2;
    expect(() => validateConfig(config)).toThrow('minCapacity cannot exceed maxCapacity');
  });

  it('prod should require MFA', () => {
    const config = getConfig('prod');
    config.security.mfaRequired = false;
    expect(() => validateConfig(config)).toThrow('Production environment requires MFA');
  });

  it('prod should require Shield', () => {
    const config = getConfig('prod');
    config.security.enableShield = false;
    expect(() => validateConfig(config)).toThrow('Production environment requires AWS Shield');
  });
});
