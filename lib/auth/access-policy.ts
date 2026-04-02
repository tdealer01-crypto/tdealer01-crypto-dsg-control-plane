export type AccessMode =
  | 'self_serve_trial'
  | 'approved_domains_auto_join'
  | 'approved_domains_require_approval'
  | 'invite_only'
  | 'sso_required'
  | 'scim_managed';

export type AccessPolicyDecision = {
  mode: 'auto_join' | 'require_approval' | 'manual_review';
  reason: AccessMode;
};

function parseDomainList(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getApprovedAutoJoinDomains(): string[] {
  return parseDomainList(process.env.APPROVED_AUTO_JOIN_DOMAINS);
}

export function getApprovedApprovalDomains(): string[] {
  const canonical = parseDomainList(process.env.APPROVED_APPROVAL_DOMAINS);
  if (canonical.length > 0) return canonical;

  // Backward-compat fallback for older env naming.
  return parseDomainList(process.env.APPROVAL_REQUIRED_DOMAINS);
}

export function resolveAccessModeForEmail(email: string): AccessMode {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const domain = normalizedEmail.split('@')[1] || '';

  const explicitMode = String(process.env.ACCESS_MODE || '').trim().toLowerCase();
  if (explicitMode === 'invite_only') return 'invite_only';
  if (explicitMode === 'sso_required') return 'sso_required';
  if (explicitMode === 'scim_managed') return 'scim_managed';

  const autoJoinDomains = getApprovedAutoJoinDomains();
  if (domain && autoJoinDomains.includes(domain)) {
    return 'approved_domains_auto_join';
  }

  const approvalDomains = getApprovedApprovalDomains();
  if (domain && approvalDomains.includes(domain)) {
    return 'approved_domains_require_approval';
  }

  return 'self_serve_trial';
}

export function resolveAccessPolicyDecision(email: string): AccessPolicyDecision {
  const mode = resolveAccessModeForEmail(email);

  if (mode === 'approved_domains_auto_join') {
    return { mode: 'auto_join', reason: mode };
  }

  if (mode === 'approved_domains_require_approval') {
    return { mode: 'require_approval', reason: mode };
  }

  return { mode: 'manual_review', reason: mode };
}
