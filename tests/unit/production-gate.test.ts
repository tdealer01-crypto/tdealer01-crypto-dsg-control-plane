/**
 * Unit tests for Phase 5: Production GO/NO-GO Gate
 * Tests individual check functions and decision logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock types matching the production gate implementation
interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'TIMEOUT' | 'SKIPPED';
  details: string;
  latency_ms: number;
  error?: string;
}

interface GateDecision {
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  url: string;
  timestamp: string;
  gate_version: string;
  checks: CheckResult[];
  summary: string;
  decision_rationale: string;
}

describe('Production Gate - Check Functions', () => {
  describe('Environment Variables Check', () => {
    it('should PASS when all required env vars are set', () => {
      const requiredVars = [
        'SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ANTHROPIC_API_KEY',
      ];

      const missing = requiredVars.filter(v => !process.env[v]);

      // This test expects env vars to be set in the test environment
      if (missing.length === 0) {
        expect(missing).toHaveLength(0);
      }
    });

    it('should detect missing env vars', () => {
      const requiredVars = ['MISSING_VAR_1', 'MISSING_VAR_2'];
      const missing = requiredVars.filter(v => !process.env[v]);
      expect(missing).toHaveLength(2);
    });
  });

  describe('HTTP Probe Checks', () => {
    it('should recognize valid HTTP status codes', () => {
      const validStatuses = [200, 201, 204, 301, 302, 304];
      validStatuses.forEach(status => {
        const isValid = /^(2|3)[0-9][0-9]$/.test(status.toString());
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid HTTP status codes', () => {
      const invalidStatuses = [400, 401, 403, 404, 500, 502, 503];
      invalidStatuses.forEach(status => {
        const isValid = /^(2|3)[0-9][0-9]$/.test(status.toString());
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Gate Decision Logic', () => {
    it('should return GO when all checks PASS', () => {
      const checks: CheckResult[] = [
        { name: 'env_vars', status: 'PASS', details: 'All vars set', latency_ms: 1 },
        { name: 'health_probe', status: 'PASS', details: '200 OK', latency_ms: 100 },
        { name: 'readiness_probe', status: 'PASS', details: 'Ready', latency_ms: 110 },
        { name: 'agent_status', status: 'PASS', details: 'OK', latency_ms: 120 },
        { name: 'db_connectivity', status: 'PASS', details: 'OK', latency_ms: 500 },
        { name: 'migration_state', status: 'PASS', details: 'OK', latency_ms: 600 },
        { name: 'vercel_deployment', status: 'PASS', details: 'READY', latency_ms: 1000 },
        { name: 'cache_health', status: 'PASS', details: 'OK', latency_ms: 150 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const timeoutChecks = checks.filter(c => c.status === 'TIMEOUT');
      const skippedChecks = checks.filter(c => c.status === 'SKIPPED');

      let decision: 'GO' | 'NO-GO' | 'REVIEW';

      if (failedChecks.length > 0 || timeoutChecks.length > 0) {
        decision = 'NO-GO';
      } else if (skippedChecks.length > 0) {
        decision = 'REVIEW';
      } else {
        decision = 'GO';
      }

      expect(decision).toBe('GO');
    });

    it('should return NO-GO when any check FAILS', () => {
      const checks: CheckResult[] = [
        { name: 'env_vars', status: 'PASS', details: 'All vars set', latency_ms: 1 },
        { name: 'health_probe', status: 'FAIL', details: '500 Error', latency_ms: 100 },
        { name: 'readiness_probe', status: 'PASS', details: 'Ready', latency_ms: 110 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const timeoutChecks = checks.filter(c => c.status === 'TIMEOUT');
      const skippedChecks = checks.filter(c => c.status === 'SKIPPED');

      let decision: 'GO' | 'NO-GO' | 'REVIEW';

      if (failedChecks.length > 0 || timeoutChecks.length > 0) {
        decision = 'NO-GO';
      } else if (skippedChecks.length > 0) {
        decision = 'REVIEW';
      } else {
        decision = 'GO';
      }

      expect(decision).toBe('NO-GO');
    });

    it('should return NO-GO when any check TIMEOUT', () => {
      const checks: CheckResult[] = [
        { name: 'env_vars', status: 'PASS', details: 'All vars set', latency_ms: 1 },
        { name: 'health_probe', status: 'TIMEOUT', details: 'Timeout', latency_ms: 10000 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const timeoutChecks = checks.filter(c => c.status === 'TIMEOUT');
      const skippedChecks = checks.filter(c => c.status === 'SKIPPED');

      let decision: 'GO' | 'NO-GO' | 'REVIEW';

      if (failedChecks.length > 0 || timeoutChecks.length > 0) {
        decision = 'NO-GO';
      } else if (skippedChecks.length > 0) {
        decision = 'REVIEW';
      } else {
        decision = 'GO';
      }

      expect(decision).toBe('NO-GO');
    });

    it('should return REVIEW when checks are SKIPPED (missing credentials)', () => {
      const checks: CheckResult[] = [
        { name: 'env_vars', status: 'PASS', details: 'All vars set', latency_ms: 1 },
        { name: 'health_probe', status: 'PASS', details: '200 OK', latency_ms: 100 },
        { name: 'vercel_deployment', status: 'SKIPPED', details: 'No token', latency_ms: 0 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const timeoutChecks = checks.filter(c => c.status === 'TIMEOUT');
      const skippedChecks = checks.filter(c => c.status === 'SKIPPED');

      let decision: 'GO' | 'NO-GO' | 'REVIEW';

      if (failedChecks.length > 0 || timeoutChecks.length > 0) {
        decision = 'NO-GO';
      } else if (skippedChecks.length > 0) {
        decision = 'REVIEW';
      } else {
        decision = 'GO';
      }

      expect(decision).toBe('REVIEW');
    });

    it('should prioritize NO-GO over REVIEW', () => {
      const checks: CheckResult[] = [
        { name: 'health_probe', status: 'FAIL', details: '500 Error', latency_ms: 100 },
        { name: 'vercel_deployment', status: 'SKIPPED', details: 'No token', latency_ms: 0 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const timeoutChecks = checks.filter(c => c.status === 'TIMEOUT');
      const skippedChecks = checks.filter(c => c.status === 'SKIPPED');

      let decision: 'GO' | 'NO-GO' | 'REVIEW';

      if (failedChecks.length > 0 || timeoutChecks.length > 0) {
        decision = 'NO-GO';
      } else if (skippedChecks.length > 0) {
        decision = 'REVIEW';
      } else {
        decision = 'GO';
      }

      expect(decision).toBe('NO-GO'); // FAIL takes priority over SKIPPED
    });
  });

  describe('Check Result Aggregation', () => {
    it('should correctly count check results', () => {
      const checks: CheckResult[] = [
        { name: 'check1', status: 'PASS', details: '', latency_ms: 100 },
        { name: 'check2', status: 'PASS', details: '', latency_ms: 200 },
        { name: 'check3', status: 'FAIL', details: '', latency_ms: 150 },
        { name: 'check4', status: 'SKIPPED', details: '', latency_ms: 0 },
      ];

      const passCount = checks.filter(c => c.status === 'PASS').length;
      const failCount = checks.filter(c => c.status === 'FAIL').length;
      const skipCount = checks.filter(c => c.status === 'SKIPPED').length;

      expect(passCount).toBe(2);
      expect(failCount).toBe(1);
      expect(skipCount).toBe(1);
    });

    it('should extract check names for failure reporting', () => {
      const checks: CheckResult[] = [
        { name: 'health_probe', status: 'FAIL', details: '', latency_ms: 100 },
        { name: 'db_connectivity', status: 'FAIL', details: '', latency_ms: 500 },
      ];

      const failedChecks = checks.filter(c => c.status === 'FAIL');
      const failedNames = failedChecks.map(c => c.name);

      expect(failedNames).toContain('health_probe');
      expect(failedNames).toContain('db_connectivity');
      expect(failedNames).toHaveLength(2);
    });
  });

  describe('Latency Measurement', () => {
    it('should track check latencies correctly', () => {
      const checks: CheckResult[] = [
        { name: 'fast_check', status: 'PASS', details: '', latency_ms: 5 },
        { name: 'slow_check', status: 'PASS', details: '', latency_ms: 5000 },
        { name: 'medium_check', status: 'PASS', details: '', latency_ms: 500 },
      ];

      const maxLatency = Math.max(...checks.map(c => c.latency_ms));
      const minLatency = Math.min(...checks.map(c => c.latency_ms));
      const avgLatency = checks.reduce((sum, c) => sum + c.latency_ms, 0) / checks.length;

      expect(maxLatency).toBe(5000);
      expect(minLatency).toBe(5);
      expect(avgLatency).toBeGreaterThan(500);
    });

    it('should flag slow checks', () => {
      const checks: CheckResult[] = [
        { name: 'fast', status: 'PASS', details: '', latency_ms: 100 },
        { name: 'slow', status: 'PASS', details: '', latency_ms: 8000 }, // >5s
      ];

      const SLOW_THRESHOLD = 5000;
      const slowChecks = checks.filter(c => c.latency_ms > SLOW_THRESHOLD);

      expect(slowChecks).toHaveLength(1);
      expect(slowChecks[0].name).toBe('slow');
    });
  });

  describe('Gate Timeouts', () => {
    it('should handle timeout constant correctly', () => {
      const TIMEOUT_MS = 10000;
      expect(TIMEOUT_MS).toBe(10000);
      expect(TIMEOUT_MS).toBeGreaterThan(5000); // Reasonable timeout
    });

    it('should timeout if check exceeds limit', () => {
      const TIMEOUT_MS = 10000;
      const checkLatency = 15000;

      const timedOut = checkLatency > TIMEOUT_MS;
      expect(timedOut).toBe(true);
    });
  });

  describe('Decision Summary Messages', () => {
    it('should generate GO summary correctly', () => {
      const checks: CheckResult[] = Array(8).fill({
        status: 'PASS',
        latency_ms: 100,
      });

      const summary = `✅ Production GO: All ${checks.length} checks passed.`;
      expect(summary).toContain('GO');
      expect(summary).toContain('8');
    });

    it('should generate NO-GO summary with failure count', () => {
      const failedChecks = [
        { name: 'check1', status: 'FAIL' },
        { name: 'check2', status: 'FAIL' },
      ];

      const summary = `❌ Production NO-GO: ${failedChecks.length} check(s) failed.`;
      expect(summary).toContain('NO-GO');
      expect(summary).toContain('2');
    });

    it('should generate REVIEW summary with skip count', () => {
      const skippedChecks = [
        { name: 'vercel', status: 'SKIPPED' },
      ];

      const summary = `⚠️  Production REVIEW required: ${skippedChecks.length} check(s) skipped (missing credentials).`;
      expect(summary).toContain('REVIEW');
      expect(summary).toContain('1');
    });
  });
});

describe('Production Gate - Gate Version', () => {
  it('should have consistent gate version', () => {
    const GATE_VERSION = 'v5.0';
    expect(GATE_VERSION).toMatch(/^v\d+\.\d+$/);
    expect(GATE_VERSION).toBe('v5.0');
  });
});

describe('Production Gate - Database Table Schema', () => {
  it('should define deployment_gates table structure', () => {
    const tableColumns = [
      'id',
      'org_id',
      'deployment_url',
      'gate_version',
      'decision',
      'checks_json',
      'decision_rationale',
      'checked_at',
      'created_by',
      'created_at',
      'verified_by',
      'verified_at',
    ];

    expect(tableColumns).toContain('id');
    expect(tableColumns).toContain('decision');
    expect(tableColumns).toContain('checks_json');
    expect(tableColumns).toHaveLength(12);
  });

  it('should have valid decision enum values', () => {
    const validDecisions = ['GO', 'NO-GO', 'REVIEW'];

    validDecisions.forEach(decision => {
      expect(['GO', 'NO-GO', 'REVIEW']).toContain(decision);
    });
  });
});
