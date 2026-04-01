import { getSupabaseAdmin } from '../supabase-server';
export type OrgDomainStatus = 'approved' | 'verified' | 'disabled';
export type ClaimMode = 'manual' | 'automatic';
export type AutoJoinMode = 'disabled' | 'auto_join' | 'require_approval';
export function normalizeDomain(value: string | null | undefined) { return String(value || '').trim().toLowerCase().replace(/^@+/, ''); }
export async function getOrgDomains(orgId: string) { const admin = getSupabaseAdmin(); const { data, error } = await admin.from('org_domains').select('*').eq('org_id', orgId).order('domain', { ascending: true }); if (error) throw error; return data || []; }
export async function findMatchingOrgDomain(emailDomain: string) { const domain = normalizeDomain(emailDomain); if (!domain) return null; const admin = getSupabaseAdmin(); const { data, error } = await admin.from('org_domains').select('*').eq('domain', domain).in('status', ['approved', 'verified']); if (error) throw error; const rows = data || []; return rows.find((r: any) => r.status === 'verified') || rows[0] || null; }
function envList(name: string) { return String(process.env[name] || '').split(',').map(normalizeDomain).filter(Boolean); }
export async function resolveDomainGovernance(emailDomain: string, orgId?: string | null) {
  const domain = normalizeDomain(emailDomain);
  if (!domain) return { source: 'default', domain, status: 'disabled', claim_mode: 'manual', auto_join_mode: 'disabled', org_id: orgId || null, is_managed_identity: false };
  let dbRule: any = null;
  if (orgId) { const rows = await getOrgDomains(orgId); dbRule = rows.find((r: any) => r.domain === domain && r.status !== 'disabled') || null; }
  if (!dbRule) dbRule = await findMatchingOrgDomain(domain);
  if (dbRule) return { source: 'db', domain, status: dbRule.status, claim_mode: dbRule.claim_mode, auto_join_mode: dbRule.auto_join_mode, org_id: dbRule.org_id, is_managed_identity: dbRule.claim_mode === 'automatic' || dbRule.status === 'verified', verification_token: dbRule.verification_token };
  if (envList('APPROVED_AUTO_JOIN_DOMAINS').includes(domain) || envList('APPROVED_DOMAINS').includes(domain)) return { source: 'env', domain, status: 'approved', claim_mode: 'manual', auto_join_mode: 'auto_join', org_id: orgId || null, is_managed_identity: false };
  if (envList('APPROVAL_REQUIRED_DOMAINS').includes(domain)) return { source: 'env', domain, status: 'approved', claim_mode: 'manual', auto_join_mode: 'require_approval', org_id: orgId || null, is_managed_identity: false };
  return { source: 'default', domain, status: 'disabled', claim_mode: 'manual', auto_join_mode: 'disabled', org_id: orgId || null, is_managed_identity: false };
}
