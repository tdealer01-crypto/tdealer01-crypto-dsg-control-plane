import { resolveDomainGovernance } from './domain-governance';

export async function resolveAccessPolicyForEmail(email: string, orgId?: string | null) {
  const domain = String(email.split('@')[1] || '').toLowerCase();
  const governance = await resolveDomainGovernance(domain, orgId);

  if (governance.auto_join_mode === 'auto_join') return { mode: 'auto_join', source: governance.source, governance };
  if (governance.auto_join_mode === 'require_approval') return { mode: 'require_approval', source: governance.source, governance };
  return { mode: 'manual_review', source: governance.source, governance };
}
