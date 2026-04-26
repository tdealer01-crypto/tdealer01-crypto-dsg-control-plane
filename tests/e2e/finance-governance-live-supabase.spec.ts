import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);

const describeLive = hasLiveSupabaseEnv ? test.describe : test.describe.skip;

describeLive('finance governance live e2e against supabase', () => {
  function getSupabase() {
    return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async function cleanupOrg(orgId: string) {
    const supabase = getSupabase();
    await supabase.from('finance_workflow_action_events').delete().eq('org_id', orgId);
    await supabase.from('finance_workflow_approvals').delete().eq('org_id', orgId);
    await supabase.from('finance_workflow_cases').delete().eq('org_id', orgId);
  }

  test('submit -> approve persists to Supabase, updates UI, and writes audit evidence', async ({ page }) => {
    const orgId = `pw-live-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    await cleanupOrg(orgId);

    await page.addInitScript((value) => {
      window.localStorage.setItem('finance-governance-demo-org-id', value);
    }, orgId);

    await page.goto('/finance-governance/live/workflow');

    await expect(page.getByRole('heading', { name: 'Read, act, and refresh in one workflow surface' })).toBeVisible();
    await expect(page.locator('tr', { hasText: 'APR-1001' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit sample workflow item' }).click();
    await expect(page.getByText('Submitted for review. Next status: pending.')).toBeVisible();

    const approvalRow = page.locator('tr', { hasText: 'APR-1001' });
    await approvalRow.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approval completed. Next status: approved.')).toBeVisible();
    await expect(approvalRow.getByText('approved')).toBeVisible();

    const supabase = getSupabase();

    const { data: events, error: eventsError } = await supabase
      .from('finance_workflow_action_events')
      .select('action,actor,result,target,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    expect(eventsError).toBeNull();
    expect((events ?? []).map((item) => item.action)).toEqual(expect.arrayContaining(['submit', 'approve']));

    for (const event of events ?? []) {
      expect(event.actor).toBe('api');
      expect(event.result).toBe('ok');
      expect(event.target).toBeTruthy();
      expect(event.created_at).toBeTruthy();
    }

    const { data: approval, error: approvalError } = await supabase
      .from('finance_workflow_approvals')
      .select('status')
      .eq('org_id', orgId)
      .eq('id', 'APR-1001')
      .single();

    expect(approvalError).toBeNull();
    expect(approval?.status).toBe('approved');

    await cleanupOrg(orgId);
  });
});
