/**
 * Stripe App Authentication Utilities
 *
 * Handles authentication for Stripe App API routes.
 * Supports two auth modes:
 * 1. DSG Dashboard: Supabase JWT via Authorization Bearer token
 * 2. Stripe App: Stripe-Account header verified against installed accounts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Org roles with approval permissions
 */
export type OrgRole = 'owner' | 'admin' | 'approver' | 'member' | 'viewer';

/**
 * Permissions that allow approval actions
 */
const APPROVAL_ROLES: OrgRole[] = ['owner', 'admin', 'approver'];

/**
 * Auth context for DSG Dashboard requests
 */
export interface DashboardAuthContext {
  type: 'dashboard';
  userId: string;
  authUserId: string;
  email: string;
  orgId: string;
  role: OrgRole;
}

/**
 * Auth context for Stripe App requests
 */
export interface StripeAppAuthContext {
  type: 'stripe_app';
  stripeAccountId: string;
  orgId: string;
  accountStatus: string;
}

/**
 * Combined auth context
 */
export type StripeAppAuthContextCombined = DashboardAuthContext | StripeAppAuthContext;

/**
 * Auth result
 */
export type AuthResult =
  | { ok: true; context: StripeAppAuthContextCombined }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Verify Supabase JWT from Authorization header
 * Returns user info if valid
 */
async function verifySupabaseJWT(authHeader: string | null): Promise<{ userId: string; email: string } | null> {
  if (!authHeader || !supabaseAdmin) return null;

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch?.[1]) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(bearerMatch[1]);
    if (error || !user?.id || !user.email) return null;
    return { userId: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Get user's org membership and role
 */
async function getUserOrgRole(userId: string): Promise<{ orgId: string; role: OrgRole } | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('id, org_id, role, is_active')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error || !profile?.id || !profile.org_id || !profile.is_active) {
      return null;
    }

    return {
      orgId: String(profile.org_id),
      role: profile.role as OrgRole,
    };
  } catch {
    return null;
  }
}

/**
 * Verify Stripe-Account header against installed accounts
 */
async function verifyStripeAccountHeader(stripeAccountId: string): Promise<{ orgId: string; status: string } | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data: account, error } = await supabaseAdmin
      .from('stripe_app_accounts')
      .select('dsg_org_id, status')
      .eq('stripe_account_id', stripeAccountId)
      .maybeSingle();

    if (error || !account) return null;
    if (account.status !== 'active') return null;

    return {
      orgId: account.dsg_org_id,
      status: account.status,
    };
  } catch {
    return null;
  }
}

/**
 * Main authentication function for Stripe App API routes
 *
 * Priority:
 * 1. Authorization Bearer token (DSG Dashboard) -> verify JWT, get org/role
 * 2. Stripe-Account header (Stripe App) -> verify installed account, get org
 *
 * Returns auth context with orgId for authorization checks
 */
export async function authenticateStripeAppRequest(
  request: {
    headers: {
      get(name: string): string | null;
    };
  }
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const stripeAccountHeader = request.headers.get('stripe-account');
  const stripeAccountIdHeader = request.headers.get('stripe-account-id');

  // Mode 1: DSG Dashboard with Bearer token
  if (authHeader) {
    const jwtUser = await verifySupabaseJWT(authHeader);
    if (!jwtUser) {
      return { ok: false, status: 401, error: 'Invalid or expired token' };
    }

    const orgRole = await getUserOrgRole(jwtUser.userId);
    if (!orgRole) {
      return { ok: false, status: 403, error: 'User not found or inactive in organization' };
    }

    // Check if role has approval permissions
    if (!APPROVAL_ROLES.includes(orgRole.role)) {
      return { ok: false, status: 403, error: 'Insufficient permission: approver role required' };
    }

    return {
      ok: true,
      context: {
        type: 'dashboard',
        userId: orgRole.orgId, // This is the profile ID in users table
        authUserId: jwtUser.userId,
        email: jwtUser.email,
        orgId: orgRole.orgId,
        role: orgRole.role,
      },
    };
  }

  // Mode 2: Stripe App with Stripe-Account header
  const stripeAccountId = stripeAccountHeader || stripeAccountIdHeader;
  if (stripeAccountId) {
    const account = await verifyStripeAccountHeader(stripeAccountId);
    if (!account) {
      return { ok: false, status: 401, error: 'Invalid or inactive Stripe account' };
    }

    return {
      ok: true,
      context: {
        type: 'stripe_app',
        stripeAccountId,
        orgId: account.orgId,
        accountStatus: account.status,
      },
    };
  }

  // No valid auth
  return { ok: false, status: 401, error: 'Missing authentication: Authorization Bearer token or Stripe-Account header required' };
}

/**
 * Verify that an approval_id exists and belongs to the given org
 */
export async function verifyApprovalOwnership(
  approvalId: string,
  orgId: string
): Promise<{ ok: true; approval: any } | { ok: false; status: 403 | 404; error: string }> {
  if (!supabaseAdmin) {
    return { ok: false, status: 403, error: 'Database not available' };
  }

  try {
    // Check approval in stripe_operation_audits (where REVIEW decisions are stored)
    const { data: audit, error } = await supabaseAdmin
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', approvalId)
      .eq('dsg_decision', 'REVIEW')
      .maybeSingle();

    if (error || !audit) {
      return { ok: false, status: 404, error: 'Approval not found' };
    }

    // Verify the audit belongs to an account in the same org
    const { data: account, error: accountError } = await supabaseAdmin
      .from('stripe_app_accounts')
      .select('dsg_org_id')
      .eq('stripe_account_id', audit.stripe_account_id)
      .maybeSingle();

    if (accountError || !account || account.dsg_org_id !== orgId) {
      return { ok: false, status: 403, error: 'Approval not accessible in this organization' };
    }

    return { ok: true, approval: audit };
  } catch {
    return { ok: false, status: 404, error: 'Approval not found' };
  }
}

/**
 * Check if user has permission to approve/reject in this org
 */
export function hasApprovalPermission(role: OrgRole): boolean {
  return APPROVAL_ROLES.includes(role);
}