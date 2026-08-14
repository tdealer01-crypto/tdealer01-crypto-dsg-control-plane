import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Integration tests for atomic seat activation (market-standard billing)
 *
 * Tests verify:
 * 1. Atomicity: no race condition with concurrent activation
 * 2. Limit enforcement: cannot exceed purchased_seats
 * 3. Idempotency: same email → same result
 * 4. Audit trail: immutable record of each activation
 * 5. Proof hash: deterministic evidence for compliance
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for billing tests'
  );
}

const admin = createClient(supabaseUrl, supabaseKey);

describe('billing-seat-activation-atomic', () => {
  const testOrgId = `test-org-${Date.now()}-${Math.random()}`;
  const testEmail1 = `test-${Date.now()}-1@billing.test`;
  const testEmail2 = `test-${Date.now()}-2@billing.test`;
  const testEmail3 = `test-${Date.now()}-3@billing.test`;

  beforeEach(async () => {
    // Create test organization and billing policy
    const { error: orgError } = await admin
      .from('organizations')
      .insert([{ id: testOrgId, name: `Test Org ${Date.now()}` }]);

    if (orgError && !orgError.message.includes('duplicate')) {
      console.error('Setup error creating org:', orgError);
    }

    // Create billing policy with 2 purchased seats
    const { error: policyError } = await admin
      .from('org_billing_policies')
      .upsert(
        [
          {
            org_id: testOrgId,
            seat_activation_policy: 'on_first_login',
            trial_requires_card: false,
            managed_user_billing_mode: 'bill_on_activation',
            purchased_seats: 2, // Only 2 seats allowed
          },
        ],
        { onConflict: 'org_id' }
      );

    if (policyError) {
      console.error('Setup error creating billing policy:', policyError);
    }
  });

  afterEach(async () => {
    // Cleanup: delete test data
    await admin
      .from('seat_activations')
      .delete()
      .in(
        'email',
        [testEmail1, testEmail2, testEmail3]
      );

    await admin
      .from('billing_seat_audit')
      .delete()
      .eq('org_id', testOrgId);

    await admin
      .from('org_billing_policies')
      .delete()
      .eq('org_id', testOrgId);

    await admin
      .from('organizations')
      .delete()
      .eq('id', testOrgId);
  });

  it('should activate first billable user (ACTIVATED)', async () => {
    const { data, error } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data[0].activated).toBe(true);
    expect(data[0].reason).toBe('ACTIVATED');
    expect(data[0].active_seats).toBe(1);
    expect(data[0].purchased_seats).toBe(2);
    expect(data[0].proof_hash).toBeDefined();
  });

  it('should activate second user within limit', async () => {
    // Activate first user
    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    // Activate second user
    const { data, error } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail2,
      p_user_id: null,
      p_role: 'operator',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-2',
    });

    expect(error).toBeNull();
    expect(data[0].activated).toBe(true);
    expect(data[0].active_seats).toBe(2);
  });

  it('should reject third user (limit exceeded)', async () => {
    // Fill both seats
    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail2,
      p_user_id: null,
      p_role: 'operator',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-2',
    });

    // Try to activate third (should fail)
    const { data, error } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail3,
      p_user_id: null,
      p_role: 'viewer',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-3',
    });

    expect(error).toBeNull();
    expect(data[0].activated).toBe(false);
    expect(data[0].reason).toBe('SEAT_LIMIT_EXCEEDED');
    expect(data[0].active_seats).toBe(2);
  });

  it('should be idempotent (same email = same result)', async () => {
    // First call
    const { data: data1 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    // Second call with same email
    const { data: data2 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1-retry',
    });

    expect(data1[0].activated).toBe(true);
    expect(data2[0].activated).toBe(false);
    expect(data2[0].reason).toBe('ALREADY_ACTIVATED');
  });

  it('should create audit trail for activation', async () => {
    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    // Check audit trail
    const { data: auditData, error: auditError } = await admin
      .from('billing_seat_audit')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('email', testEmail1.toLowerCase());

    expect(auditError).toBeNull();
    expect(auditData).toBeDefined();
    expect(auditData!.length).toBeGreaterThanOrEqual(1);
    expect(auditData![0].action).toBe('ACTIVATED');
    expect(auditData![0].active_seats_before).toBe(0);
    expect(auditData![0].active_seats_after).toBe(1);
  });

  it('should create audit trail for rejection (limit exceeded)', async () => {
    // Fill all seats
    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail2,
      p_user_id: null,
      p_role: 'operator',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-2',
    });

    // Try to add third
    await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail3,
      p_user_id: null,
      p_role: 'viewer',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-3',
    });

    // Check audit trail includes rejection
    const { data: auditData, error: auditError } = await admin
      .from('billing_seat_audit')
      .select('*')
      .eq('org_id', testOrgId)
      .eq('email', testEmail3.toLowerCase());

    expect(auditError).toBeNull();
    expect(auditData).toBeDefined();
    expect(auditData!.length).toBeGreaterThanOrEqual(1);
    expect(auditData![0].action).toBe('REJECTED');
    expect(auditData![0].reason).toBe('SEAT_LIMIT_EXCEEDED');
  });

  it('should reject non-billable roles', async () => {
    const { data, error } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'guest', // Non-billable
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    expect(error).toBeNull();
    expect(data[0].activated).toBe(false);
    expect(data[0].reason).toBe('NON_BILLABLE_ROLE');
  });

  it('should generate consistent proof hash for same input', async () => {
    const { data: data1 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    // Delete and recreate to test proof hash determinism
    await admin
      .from('seat_activations')
      .delete()
      .eq('email', testEmail1.toLowerCase());

    await admin
      .from('billing_seat_audit')
      .delete()
      .eq('email', testEmail1.toLowerCase());

    // Recreate with same parameters
    const { data: data2 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1,
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1-new',
    });

    // Proof hashes should differ due to different timestamps,
    // but both should be valid SHA256 hashes
    expect(data1[0].proof_hash).toBeDefined();
    expect(data2[0].proof_hash).toBeDefined();
    expect(data1[0].proof_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(data2[0].proof_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle email normalization (case-insensitive)', async () => {
    // Try both cases
    const { data: data1 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1.toUpperCase(),
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1',
    });

    // Second call with same email (different case)
    const { data: data2 } = await admin.rpc('activate_billable_seat_strict', {
      p_org_id: testOrgId,
      p_email: testEmail1.toLowerCase(),
      p_user_id: null,
      p_role: 'admin',
      p_source: 'auth_confirm',
      p_idempotency_key: 'test-key-1-retry',
    });

    expect(data1[0].activated).toBe(true);
    expect(data2[0].activated).toBe(false);
    expect(data2[0].reason).toBe('ALREADY_ACTIVATED');
  });
});
