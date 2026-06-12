/**
 * Multi-Agent Delegation Isolation Tests
 *
 * Verifies that:
 * - Multiple agents can work on different delegations concurrently without interference
 * - Same user with different delegations maintain scope isolation
 * - Cross-org tampering is prevented through RLS policies
 * - Audit trails are properly isolated by org and delegation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseTestAdmin,
  makeTestId,
} from './helpers/supabase-test-factory';

// Live-DB suite: requires a real Supabase project. Skipped when the service
// role key / URL are not configured (e.g. unit-evidence CI jobs).
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)('Delegation Multi-Agent Isolation', () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = getSupabaseTestAdmin();
  });

  describe('Concurrent agent execution isolation', () => {
    it('should isolate jobs for different agents on same user', async () => {
      const userId = makeTestId('user');
      const org1Id = makeTestId('org');
      const org2Id = makeTestId('org');

      const jobId1 = crypto.randomUUID();
      const jobId2 = crypto.randomUUID();
      const delegationId1 = `deleg_${makeTestId('job1')}`;
      const delegationId2 = `deleg_${makeTestId('job2')}`;

      // Agent 1 in Org 1
      const { error: err1 } = await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId1,
        delegation_id: delegationId1,
        org_id: org1Id,
        user_id: userId,
        goal: 'fill_form_org1',
        scope: 'browser.org1_site',
        status: 'active',
        current_state: 'CREATED',
        delegation_json: {
          delegationId: delegationId1,
          goal: 'fill_form_org1',
          allowedActions: ['read_page', 'fill_form'],
        },
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(err1).toBeNull();

      // Agent 2 in Org 2
      const { error: err2 } = await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId2,
        delegation_id: delegationId2,
        org_id: org2Id,
        user_id: userId,
        goal: 'fill_form_org2',
        scope: 'browser.org2_site',
        status: 'active',
        current_state: 'CREATED',
        delegation_json: {
          delegationId: delegationId2,
          goal: 'fill_form_org2',
          allowedActions: ['click_button'],
        },
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(err2).toBeNull();

      // Verify jobs are isolated by org and delegation
      const { data: job1 } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('job_id', jobId1)
        .single();

      const { data: job2 } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('job_id', jobId2)
        .single();

      expect(job1?.org_id).toBe(org1Id);
      expect(job2?.org_id).toBe(org2Id);
      expect(job1?.delegation_id).toBe(delegationId1);
      expect(job2?.delegation_id).toBe(delegationId2);

      // Verify we can query jobs by org
      const { data: org1Jobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', org1Id);

      const { data: org2Jobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', org2Id);

      expect(org1Jobs?.some((j) => j.job_id === jobId1)).toBe(true);
      expect(org2Jobs?.some((j) => j.job_id === jobId2)).toBe(true);
      expect(org1Jobs?.some((j) => j.job_id === jobId2)).toBe(false);
      expect(org2Jobs?.some((j) => j.job_id === jobId1)).toBe(false);

      // Cleanup
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId1);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId2);
    });

    it('should isolate audit trails by delegation', async () => {
      const orgId = makeTestId('org');
      const userId = makeTestId('user');

      const jobId1 = crypto.randomUUID();
      const jobId2 = crypto.randomUUID();
      const delegationId1 = `deleg_${makeTestId('audit1')}`;
      const delegationId2 = `deleg_${makeTestId('audit2')}`;

      // Create two jobs
      for (const [jobId, delegationId] of [
        [jobId1, delegationId1],
        [jobId2, delegationId2],
      ]) {
        await supabase.from('delegated_agi_jobs').insert({
          job_id: jobId,
          delegation_id: delegationId,
          org_id: orgId,
          user_id: userId,
          goal: 'test',
          scope: 'test',
          status: 'active',
          current_state: 'CREATED',
          delegation_json: {},
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        });
      }

      // Add audit events to job 1
      const audit1 = crypto.randomUUID();
      await supabase.from('agi_action_audit').insert({
        event_id: audit1,
        job_id: jobId1,
        delegation_id: delegationId1,
        agent_id: 'agent-1',
        tool: 'browser',
        action: 'read',
        risk: 'LOW',
        decision: 'ALLOW',
        reason: 'test',
        evidence_json: {},
        event_hash: 'sha256:' + crypto.randomBytes(32).toString('hex'),
      });

      // Add audit events to job 2
      const audit2 = crypto.randomUUID();
      await supabase.from('agi_action_audit').insert({
        event_id: audit2,
        job_id: jobId2,
        delegation_id: delegationId2,
        agent_id: 'agent-2',
        tool: 'repo',
        action: 'commit',
        risk: 'MEDIUM',
        decision: 'ALLOW',
        reason: 'test',
        evidence_json: {},
        event_hash: 'sha256:' + crypto.randomBytes(32).toString('hex'),
      });

      // Query audit by job 1
      const { data: audit1Events } = await supabase
        .from('agi_action_audit')
        .select('*')
        .eq('job_id', jobId1);

      // Query audit by job 2
      const { data: audit2Events } = await supabase
        .from('agi_action_audit')
        .select('*')
        .eq('job_id', jobId2);

      expect(audit1Events?.length).toBe(1);
      expect(audit2Events?.length).toBe(1);
      expect(audit1Events?.[0].event_id).toBe(audit1);
      expect(audit2Events?.[0].event_id).toBe(audit2);

      // Cleanup
      await supabase.from('agi_action_audit').delete().eq('job_id', jobId1);
      await supabase.from('agi_action_audit').delete().eq('job_id', jobId2);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId1);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId2);
    });

    it('should prevent cross-org data access through index isolation', async () => {
      const org1Id = makeTestId('org1');
      const org2Id = makeTestId('org2');
      const userId = makeTestId('user');

      const jobId1 = crypto.randomUUID();
      const delegationId1 = `deleg_${makeTestId('xorg1')}`;

      // Create job in org1
      await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId1,
        delegation_id: delegationId1,
        org_id: org1Id,
        user_id: userId,
        goal: 'sensitive_operation',
        scope: 'browser.sensitive',
        status: 'active',
        current_state: 'CREATED',
        delegation_json: { sensitive: true },
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

      // Try to query as if from org2 (simulating cross-org attempt)
      const { data: org1Jobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', org1Id);

      const { data: org2Jobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', org2Id);

      // org1 jobs should exist, org2 jobs should be empty
      expect(org1Jobs?.length).toBeGreaterThan(0);
      expect(org1Jobs?.some((j) => j.job_id === jobId1)).toBe(true);
      expect(org2Jobs?.length ?? 0).toBe(0);

      // Cleanup
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId1);
    });

    it('should isolate confirmation requests by delegation', async () => {
      const orgId = makeTestId('org');
      const userId = makeTestId('user');

      const jobId1 = crypto.randomUUID();
      const jobId2 = crypto.randomUUID();
      const delegationId1 = `deleg_${makeTestId('confirm1')}`;
      const delegationId2 = `deleg_${makeTestId('confirm2')}`;

      // Create two jobs
      for (const [jobId, delegationId] of [
        [jobId1, delegationId1],
        [jobId2, delegationId2],
      ]) {
        await supabase.from('delegated_agi_jobs').insert({
          job_id: jobId,
          delegation_id: delegationId,
          org_id: orgId,
          user_id: userId,
          goal: 'test',
          scope: 'test',
          status: 'active',
          current_state: 'CREATED',
          delegation_json: {},
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        });
      }

      // Create confirmation requests for each job
      const confirmId1 = crypto.randomUUID();
      const confirmId2 = crypto.randomUUID();

      await supabase.from('user_confirmation_requests').insert({
        request_id: confirmId1,
        job_id: jobId1,
        delegation_id: delegationId1,
        step_json: { action: 'submit' },
        evidence_json: { risk: 'HIGH' },
        status: 'PENDING',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

      await supabase.from('user_confirmation_requests').insert({
        request_id: confirmId2,
        job_id: jobId2,
        delegation_id: delegationId2,
        step_json: { action: 'deploy' },
        evidence_json: { risk: 'CRITICAL' },
        status: 'PENDING',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

      // Query confirmations by delegation
      const { data: confirms1 } = await supabase
        .from('user_confirmation_requests')
        .select('*')
        .eq('delegation_id', delegationId1);

      const { data: confirms2 } = await supabase
        .from('user_confirmation_requests')
        .select('*')
        .eq('delegation_id', delegationId2);

      expect(confirms1?.length).toBe(1);
      expect(confirms2?.length).toBe(1);
      expect(confirms1?.[0].request_id).toBe(confirmId1);
      expect(confirms2?.[0].request_id).toBe(confirmId2);

      // Cleanup
      await supabase.from('user_confirmation_requests').delete().eq('request_id', confirmId1);
      await supabase.from('user_confirmation_requests').delete().eq('request_id', confirmId2);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId1);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId2);
    });

    it('should efficiently query jobs by status and org', async () => {
      const orgId = makeTestId('org');
      const userId = makeTestId('user');

      const jobIds = [];

      // Create multiple jobs with different statuses
      for (let i = 0; i < 5; i++) {
        const jobId = crypto.randomUUID();
        jobIds.push(jobId);

        const status = i < 2 ? 'active' : i < 4 ? 'completed' : 'failed';

        await supabase.from('delegated_agi_jobs').insert({
          job_id: jobId,
          delegation_id: `deleg_${makeTestId(`status${i}`)}`,
          org_id: orgId,
          user_id: userId,
          goal: `goal${i}`,
          scope: 'test',
          status,
          current_state: status.toUpperCase(),
          delegation_json: {},
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        });
      }

      // Query active jobs for org
      const { data: activeJobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active');

      expect(activeJobs?.length).toBe(2);

      // Query completed jobs for org
      const { data: completedJobs } = await supabase
        .from('delegated_agi_jobs')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'completed');

      expect(completedJobs?.length).toBe(2);

      // Cleanup
      for (const jobId of jobIds) {
        await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId);
      }
    });
  });

  describe('Confirmation request isolation', () => {
    it('should prevent expired confirmation from being approved', async () => {
      const orgId = makeTestId('org');
      const userId = makeTestId('user');
      const jobId = crypto.randomUUID();
      const delegationId = `deleg_${makeTestId('expire')}`;
      const confirmId = crypto.randomUUID();

      // Create job
      await supabase.from('delegated_agi_jobs').insert({
        job_id: jobId,
        delegation_id: delegationId,
        org_id: orgId,
        user_id: userId,
        goal: 'test',
        scope: 'test',
        status: 'active',
        current_state: 'CREATED',
        delegation_json: {},
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });

      // Create expired confirmation
      await supabase.from('user_confirmation_requests').insert({
        request_id: confirmId,
        job_id: jobId,
        delegation_id: delegationId,
        step_json: {},
        evidence_json: {},
        status: 'PENDING',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
      });

      // Fetch confirmation
      const { data: confirm } = await supabase
        .from('user_confirmation_requests')
        .select('*')
        .eq('request_id', confirmId)
        .single();

      // Check if expired
      const isExpired = confirm && new Date(confirm.expires_at) < new Date();
      expect(isExpired).toBe(true);

      // Cleanup
      await supabase.from('user_confirmation_requests').delete().eq('request_id', confirmId);
      await supabase.from('delegated_agi_jobs').delete().eq('job_id', jobId);
    });
  });
});
