import { describe, expect, it } from 'vitest';
import { hasOrgPermission, normalizeOrgRole, type OrgPermission, type OrgRole } from '../../../lib/auth/rbac';

const ALL: OrgPermission[] = [
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

describe('org rbac matrix', () => {
  it('normalizes known and unknown roles', () => {
    expect(normalizeOrgRole('owner')).toBe('owner');
    expect(normalizeOrgRole('ADMIN')).toBe('admin');
    expect(normalizeOrgRole('n/a')).toBe('viewer');
  });

  it('matches required permission matrix', () => {
    const expected: Record<OrgRole, OrgPermission[]> = {
      owner: ALL,
      admin: [
        'org.manage_access',
        'org.manage_security',
        'org.manage_policies',
        'org.manage_agents',
        'org.execute',
        'org.view_reports',
        'org.view_evidence',
        'org.invite_members',
        'org.invite_guests',
      ],
      operator: ['org.manage_agents', 'org.execute', 'org.view_reports', 'org.view_evidence'],
      viewer: ['org.view_reports', 'org.view_evidence'],
      guest_auditor: ['org.view_reports', 'org.view_evidence'],
    };

    (Object.keys(expected) as OrgRole[]).forEach((role) => {
      ALL.forEach((permission) => {
        expect(hasOrgPermission(role, permission)).toBe(expected[role].includes(permission));
      });
    });
  });
});
