import { describe, it, expect } from 'vitest';
import { validateReadinessConfig, validateReadinessCheckRequest } from '@/lib/validation/readiness-validation';

describe('Readiness Validation', () => {
  describe('validateReadinessConfig', () => {
    it('should accept valid readiness config', () => {
      const data = {
        minTestCoveragePercent: 85,
        requireNApprovals: 2,
        blockOnSecrets: true,
        blockOnFailedCI: true,
        autoMergeOnPass: false,
      };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.minTestCoveragePercent).toBe(85);
    });

    it('should accept partial config update', () => {
      const data = {
        minTestCoveragePercent: 90,
      };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(true);
      expect(result.data?.minTestCoveragePercent).toBe(90);
    });

    it('should accept empty config (all optional)', () => {
      const data = {};

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject coverage < 0', () => {
      const data = { minTestCoveragePercent: -1 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'minTestCoveragePercent')).toBe(true);
    });

    it('should reject coverage > 100', () => {
      const data = { minTestCoveragePercent: 101 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'minTestCoveragePercent')).toBe(true);
    });

    it('should reject non-integer coverage', () => {
      const data = { minTestCoveragePercent: 85.5 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'minTestCoveragePercent')).toBe(true);
    });

    it('should accept coverage 0 and 100', () => {
      for (const coverage of [0, 100]) {
        const data = { minTestCoveragePercent: coverage };
        const result = validateReadinessConfig(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject requireNApprovals < 1', () => {
      const data = { requireNApprovals: 0 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'requireNApprovals')).toBe(true);
    });

    it('should reject requireNApprovals > 10', () => {
      const data = { requireNApprovals: 11 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'requireNApprovals')).toBe(true);
    });

    it('should reject non-integer approvals', () => {
      const data = { requireNApprovals: 2.5 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
    });

    it('should accept requireNApprovals 1-10', () => {
      for (let i = 1; i <= 10; i++) {
        const data = { requireNApprovals: i };
        const result = validateReadinessConfig(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject non-boolean blockOnSecrets', () => {
      const data = { blockOnSecrets: 'yes' };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'blockOnSecrets')).toBe(true);
    });

    it('should accept boolean blockOnSecrets', () => {
      for (const val of [true, false]) {
        const data = { blockOnSecrets: val };
        const result = validateReadinessConfig(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject non-boolean blockOnFailedCI', () => {
      const data = { blockOnFailedCI: 'true' };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
    });

    it('should reject non-boolean autoMergeOnPass', () => {
      const data = { autoMergeOnPass: 1 };

      const result = validateReadinessConfig(data);
      expect(result.valid).toBe(false);
    });

    it('should reject non-object input', () => {
      const result = validateReadinessConfig('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_INPUT');
    });
  });

  describe('validateReadinessCheckRequest', () => {
    it('should accept valid check request', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        coveragePercent: 85,
        approvalCount: 2,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.repoUrl).toBe('https://github.com/user/repo');
    });

    it('should use default coveragePercent if not provided', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(true);
      expect(result.data?.coveragePercent).toBe(82);
    });

    it('should use default approvalCount if not provided', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(true);
      expect(result.data?.approvalCount).toBe(1);
    });

    it('should reject missing repoUrl', () => {
      const data = {
        coveragePercent: 85,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'repoUrl')).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const data = {
        repoUrl: 'not-a-url',
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'repoUrl')).toBe(true);
    });

    it('should accept http and https URLs', () => {
      for (const url of ['http://github.com/user/repo', 'https://github.com/user/repo']) {
        const data = { repoUrl: url };
        const result = validateReadinessCheckRequest(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject coveragePercent < 0', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        coveragePercent: -1,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'coveragePercent')).toBe(true);
    });

    it('should reject coveragePercent > 100', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        coveragePercent: 101,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'coveragePercent')).toBe(true);
    });

    it('should accept coveragePercent 0-100', () => {
      for (const coverage of [0, 50, 100]) {
        const data = {
          repoUrl: 'https://github.com/user/repo',
          coveragePercent: coverage,
        };
        const result = validateReadinessCheckRequest(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject approvalCount < 0', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        approvalCount: -1,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'approvalCount')).toBe(true);
    });

    it('should reject approvalCount > 20', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        approvalCount: 21,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'approvalCount')).toBe(true);
    });

    it('should reject non-integer approvalCount', () => {
      const data = {
        repoUrl: 'https://github.com/user/repo',
        approvalCount: 2.5,
      };

      const result = validateReadinessCheckRequest(data);
      expect(result.valid).toBe(false);
    });

    it('should accept approvalCount 0-20', () => {
      for (const count of [0, 10, 20]) {
        const data = {
          repoUrl: 'https://github.com/user/repo',
          approvalCount: count,
        };
        const result = validateReadinessCheckRequest(data);
        expect(result.valid).toBe(true);
      }
    });
  });
});
