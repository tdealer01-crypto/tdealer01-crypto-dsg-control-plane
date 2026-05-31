export async function ensureOrgHasOwner(admin: any, orgId: string) {
  const { data, error } = await admin.from('users').select('id').eq('org_id', orgId).eq('role', 'owner').eq('is_active', true);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Organization must always have at least one owner.');
  return true;
}

export async function preventRemovingLastOwner(admin: any, orgId: string, userId: string, targetRole: string) {
  if (targetRole === 'owner') return true;
  const { data, error } = await admin.from('users').select('id').eq('org_id', orgId).eq('role', 'owner').eq('is_active', true);
  if (error) throw error;
  if ((data || []).length <= 1 && (data || [])[0]?.id === userId) throw new Error('Cannot remove or demote the last owner. Add another owner first.');
  return true;
}

export async function canEnforceSsoSafely(admin: any, orgId: string) {
  const { data: config } = await admin.from('org_security_settings').select('sso_enabled,sso_metadata,break_glass_email_enabled').eq('org_id', orgId).maybeSingle();
  const hasSsoConfig = Boolean(config?.sso_enabled && config?.sso_metadata && Object.keys(config.sso_metadata || {}).length > 0);
  const hasBreakGlass = Boolean(config?.break_glass_email_enabled);
  return { ok: hasSsoConfig || hasBreakGlass, hasSsoConfig, hasBreakGlass };
}

export async function preventDisablingAllRecoveryPaths(admin: any, orgId: string) {
  const { ok } = await canEnforceSsoSafely(admin, orgId);
  if (!ok) throw new Error('Cannot enforce SSO yet. Configure SSO or keep break-glass email sign-in enabled for owners.');
  return true;
}
