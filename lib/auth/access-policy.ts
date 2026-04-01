import { getSupabaseAdmin } from '../supabase-server';

export type AccessMode =
  | 'self_serve_trial'
  | 'approved_domains_auto_join'
  | 'approved_domains_require_approval'
  | 'invite_only'
  | 'sso_required'
  | 'scim_managed';

export type ResolvedAccessPolicy = {
  email: string;
  domain: string | null;
  isExistingOperatorMember: boolean;
  // accessMode applies to non-member entry paths. Existing members are routed by isExistingOperatorMember.
  accessMode: AccessMode;
};

function parseDomainList(envValue: string | undefined): Set<string> {
  return new Set(
    String(envValue || '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function getEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

async function findProvisionedOperatorMember(email: string) {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('is_active', true)
    .not('org_id', 'is', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

export async function resolveAccessPolicyForEmail(rawEmail: string): Promise<ResolvedAccessPolicy> {
  const email = normalizeEmail(rawEmail);
  const domain = getEmailDomain(email);

  const isExistingOperatorMember = email ? await findProvisionedOperatorMember(email) : false;

  if (isExistingOperatorMember) {
    return {
      email,
      domain,
      isExistingOperatorMember,
      // existing operator/member stays on dedicated member branch in /auth/continue
      accessMode: 'self_serve_trial',
    };
  }

  const autoJoinDomains = parseDomainList(process.env.APPROVED_AUTO_JOIN_DOMAINS);
  const approvalDomains = parseDomainList(process.env.APPROVED_APPROVAL_DOMAINS);

  if (domain && autoJoinDomains.has(domain)) {
    return {
      email,
      domain,
      isExistingOperatorMember,
      accessMode: 'approved_domains_auto_join',
    };
  }

  if (domain && approvalDomains.has(domain)) {
    return {
      email,
      domain,
      isExistingOperatorMember,
      accessMode: 'approved_domains_require_approval',
    };
  }

  return {
    email,
    domain,
    isExistingOperatorMember,
    accessMode: 'self_serve_trial',
  };
}
