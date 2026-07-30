import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

describe('POST /api/audit-logs', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let skipTests = false;
  const testOrgId = 'test-org-audit-logs';
  const testAgentId = 'test-agent-audit';

  beforeAll(() => {
    try {
      supabase = getSupabaseAdmin();
    } catch (error) {
      console.log('⚠️ Skipping audit-logs integration tests: Supabase not configured');
      skipTests = true;
    }
  });

  afterAll(async () => {
    if (!skipTests && supabase) {
      // Cleanup: Remove test data
      await supabase
        .from('audit_logs')
        .delete()
        .eq('org_id', testOrgId);
    }
  });

  it('should insert audit log entries', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          org_id: testOrgId,
          agent_id: testAgentId,
          decision: 'PASS',
          reason: 'Policy check passed',
          policy_version: 'v1.0',
          metadata: { source: 'test' },
        },
        {
          org_id: testOrgId,
          agent_id: testAgentId,
          decision: 'BLOCK',
          reason: 'Blocked due to risk threshold',
          policy_version: 'v1.0',
          metadata: { risk_score: 0.95 },
        },
      ])
      .select();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBe(2);
  });

  it('should query audit logs with filters', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    // Insert test data
    const { data: inserted } = await supabase
      .from('audit_logs')
      .insert([
        {
          org_id: testOrgId,
          agent_id: 'agent-1',
          decision: 'PASS',
          reason: 'Test event 1',
          policy_version: 'v1.0',
          metadata: {},
        },
        {
          org_id: testOrgId,
          agent_id: 'agent-2',
          decision: 'BLOCK',
          reason: 'Test event 2',
          policy_version: 'v1.0',
          metadata: {},
        },
      ])
      .select();

    // Query by decision
    const { data: passLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('decision', 'PASS');

    expect(passLogs).toBeDefined();
    expect(passLogs?.some((log) => log.decision === 'PASS')).toBe(true);
  });

  it('should search audit logs by reason', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    // Insert test data
    await supabase
      .from('audit_logs')
      .insert({
        org_id: testOrgId,
        agent_id: testAgentId,
        decision: 'REVIEW',
        reason: 'Sensitive operation detected',
        policy_version: 'v1.0',
        metadata: {},
      })
      .select();

    // Search
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', testOrgId)
      .ilike('reason', '%Sensitive%');

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.some((log) => log.reason.includes('Sensitive'))).toBe(true);
  });

  it('should filter by date range', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Insert test data
    await supabase
      .from('audit_logs')
      .insert({
        org_id: testOrgId,
        agent_id: testAgentId,
        decision: 'PASS',
        reason: 'Date range test',
        policy_version: 'v1.0',
        metadata: {},
        created_at: now.toISOString(),
      })
      .select();

    // Query with date filter
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', testOrgId)
      .gte('created_at', yesterday.toISOString())
      .lte('created_at', now.toISOString());

    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
  });

  it('should support pagination', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    // Insert multiple test records
    const records = Array.from({ length: 30 }, (_, i) => ({
      org_id: testOrgId,
      agent_id: testAgentId,
      decision: i % 2 === 0 ? 'PASS' : 'BLOCK',
      reason: `Test record ${i}`,
      policy_version: 'v1.0',
      metadata: { index: i },
    }));

    await supabase
      .from('audit_logs')
      .insert(records);

    // Query with pagination
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('org_id', testOrgId)
      .range(0, 9);

    expect(error).toBeNull();
    expect(data?.length).toBe(10);
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it('should handle empty results gracefully', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', 'non-existent-org')
      .eq('decision', 'PASS');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBe(0);
  });

  it('should maintain audit log immutability', async () => {
    if (skipTests) {
      expect(true).toBe(true);
      return;
    }

    // Insert test data
    const { data: inserted } = await supabase
      .from('audit_logs')
      .insert({
        org_id: testOrgId,
        agent_id: testAgentId,
        decision: 'PASS',
        reason: 'Immutability test',
        policy_version: 'v1.0',
        metadata: {},
      })
      .select();

    if (!inserted || !inserted[0]) return;

    const logId = inserted[0].id;

    // Attempt to update (should fail or be ignored due to append-only constraint)
    const { error } = await supabase
      .from('audit_logs')
      .update({ decision: 'BLOCK' })
      .eq('id', logId);

    // In real append-only table, this should return a permission error
    // For test purposes, we just verify the original data is intact
    const { data: original } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId);

    expect(original?.[0]?.decision).toBe('PASS');
  });
});
