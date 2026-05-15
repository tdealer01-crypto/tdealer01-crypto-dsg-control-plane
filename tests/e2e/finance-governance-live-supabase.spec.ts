import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);
const hasE2ECredentials = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

// ต้องการทั้ง Supabase service role (seed/verify DB) และ auth session (global-setup)
const describeLive = hasLiveSupabaseEnv && hasE2ECredentials ? test.describe : test.describe.skip;

describeLive('finance governance live e2e against supabase', () => {
  function getAdmin() {
    return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // ดึง org_id ของ test user จาก Supabase โดยใช้ email
  async function getTestOrgId(): Promise<string> {
    const admin = getAdmin();
    const email = process.env.E2E_TEST_EMAIL!;
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find((u) => u.email === email);
    if (!authUser) throw new Error(`E2E test user not found: ${email}`);

    const { data: profile } = await admin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (!profile?.org_id) throw new Error(`org_id not found for user: ${email}`);
    return String(profile.org_id);
  }

  async function seedApproval(orgId: string) {
    const admin = getAdmin();
    // upsert ให้ idempotent — รันซ้ำได้
    await admin.from('finance_workflow_cases').upsert({
      id: 'E2E-CASE-001',
      org_id: orgId,
      status: 'Pending',
      export_status: 'Not ready',
      vendor: 'Northwind Supply',
      amount: '14250',
      currency: 'USD',
      workflow: 'Invoice approval governance',
    }, { onConflict: 'id,org_id' }).throwOnError();

    await admin.from('finance_workflow_approvals').upsert({
      id: 'APR-1001',
      org_id: orgId,
      case_id: 'E2E-CASE-001',
      vendor: 'Northwind Supply',
      amount: 'US$14,250',
      status: 'Needs approver',
      risk: 'Threshold exceeded',
    }, { onConflict: 'id,org_id' }).throwOnError();
  }

  async function cleanupTestData(orgId: string) {
    const admin = getAdmin();
    await admin.from('finance_governance_audit_ledger').delete().eq('org_id', orgId).eq('case_id', 'E2E-CASE-001');
    await admin.from('finance_workflow_action_events').delete().eq('org_id', orgId).eq('case_id', 'E2E-CASE-001');
    await admin.from('finance_workflow_approvals').delete().eq('org_id', orgId).eq('id', 'APR-1001');
    await admin.from('finance_workflow_cases').delete().eq('org_id', orgId).eq('id', 'E2E-CASE-001');
  }

  test('submit -> approve persists to Supabase, updates UI, and writes audit evidence', async ({ page }) => {
    const orgId = await getTestOrgId();

    await cleanupTestData(orgId);
    await seedApproval(orgId);

    // global-setup ได้ inject storageState (cookies) ให้แล้ว — ไม่ต้อง login อีก
    await page.goto('/finance-governance/live/workflow');

    await expect(page.getByRole('heading', { name: 'Read, act, and refresh in one workflow surface' })).toBeVisible();
    await expect(page.locator('tr', { hasText: 'APR-1001' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit sample workflow item' }).click();
    await expect(page.getByText('Submitted for review. Next status: pending.')).toBeVisible();

    const approvalRow = page.locator('tr', { hasText: 'APR-1001' });
    await approvalRow.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approval completed. Next status: approved.')).toBeVisible();
    await expect(approvalRow.getByText('approved')).toBeVisible();

    // ตรวจ DB ตรงๆ ด้วย service_role
    const admin = getAdmin();

    const { data: events, error: eventsError } = await admin
      .from('finance_workflow_action_events')
      .select('action,actor,result,target,created_at')
      .eq('org_id', orgId)
      .eq('case_id', 'E2E-CASE-001')
      .order('created_at', { ascending: true });

    expect(eventsError).toBeNull();
    expect((events ?? []).map((e) => e.action)).toEqual(expect.arrayContaining(['submit', 'approve']));
    for (const event of events ?? []) {
      expect(event.actor).toBe('api');
      expect(event.result).toBe('ok');
      expect(event.target).toBeTruthy();
    }

    const { data: approval, error: approvalError } = await admin
      .from('finance_workflow_approvals')
      .select('status')
      .eq('org_id', orgId)
      .eq('id', 'APR-1001')
      .single();

    expect(approvalError).toBeNull();
    expect(approval?.status).toBe('approved');

    await cleanupTestData(orgId);
  });
});
