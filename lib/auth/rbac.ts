export type OrgRole = 'owner' | 'admin' | 'operator' | 'viewer' | 'guest_auditor';

export type OrgPermission =
  | 'org.manage_access'
  | 'org.manage_billing'
  | 'org.manage_security'
  | 'org.manage_policies'
  | 'org.manage_agents'
  | 'org.execute'
  | 'org.view_reports'
  | 'org.view_evidence'
  | 'org.invite_members'
  | 'org.invite_guests';

const ALL_PERMISSIONS: OrgPermission[] = [
  'org.manage_access',
  'org.manage_billing',
  'org.manage_security',
  'org.manage_policies',
  'org.manage_agents',
  'org.execute',
  'org.view_reports',
  'org.view_evidence',
  'org.invite_members',
  'org.invite_guests',
];

const ROLE_PERMISSIONS: Record<OrgRole, Set<OrgPermission>> = {
  owner: new Set<OrgPermission>(ALL_PERMISSIONS),
  admin: new Set<OrgPermission>([
    'org.manage_access',
    'org.manage_security',
    'org.manage_policies',
    'org.manage_agents',
    'org.execute',
    'org.view_reports',
    'org.view_evidence',
    'org.invite_members',
    'org.invite_guests',
  ]),
  operator: new Set<OrgPermission>(['org.manage_agents', 'org.execute', 'org.view_reports', 'org.view_evidence']),
  viewer: new Set<OrgPermission>(['org.view_reports', 'org.view_evidence']),
  guest_auditor: new Set<OrgPermission>(['org.view_reports', 'org.view_evidence']),
};

export function normalizeOrgRole(value: unknown): OrgRole {
  if (typeof value !== 'string') return 'viewer';

  const normalized = value.trim().toLowerCase();

  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'operator') return 'operator';
  if (normalized === 'viewer') return 'viewer';
  if (normalized === 'guest_auditor') return 'guest_auditor';

  return 'viewer';
}

export function hasOrgPermission(role: OrgRole, permission: OrgPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
