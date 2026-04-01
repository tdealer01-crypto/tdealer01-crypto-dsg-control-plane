export type AccessMode =
  | 'self_serve_trial'
  | 'approved_domains_auto_join'
  | 'approved_domains_require_approval'
  | 'invite_only'
  | 'sso_required'
  | 'scim_managed';

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
  return parseDomainList(process.env.APPROVED_APPROVAL_DOMAINS);
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
