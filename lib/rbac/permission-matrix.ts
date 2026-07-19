/**
 * RBAC Permission Matrix
 *
 * Defines all available permissions in the system and their descriptions.
 * Used for role creation, permission validation, and authorization checks.
 */

export enum PermissionAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage',
}

export enum PermissionResource {
  AUDIT = 'audit',
  API_KEYS = 'api-keys',
  WEBHOOKS = 'webhooks',
  NOTIFICATIONS = 'notifications',
  USERS = 'users',
  ROLES = 'roles',
  SETTINGS = 'settings',
  POLICIES = 'policies',
  GATES = 'gates',
  PROOFS = 'proofs',
  USAGE = 'usage',
  RBAC = 'rbac',
  SSO = 'sso',
  COMPLIANCE = 'compliance',
}

export interface PermissionDefinition {
  name: string;
  action: PermissionAction;
  resource: PermissionResource;
  description: string;
}

/**
 * Define all available permissions in the system
 */
export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // Audit permissions
  'read:audit': {
    name: 'read:audit',
    action: PermissionAction.READ,
    resource: PermissionResource.AUDIT,
    description: 'Read audit logs and compliance trails',
  },
  'export:audit': {
    name: 'export:audit',
    action: PermissionAction.READ,
    resource: PermissionResource.AUDIT,
    description: 'Export audit logs (SIEM, JSON, CSV)',
  },

  // API Keys permissions
  'read:api-keys': {
    name: 'read:api-keys',
    action: PermissionAction.READ,
    resource: PermissionResource.API_KEYS,
    description: 'Read API keys (hashed)',
  },
  'write:api-keys': {
    name: 'write:api-keys',
    action: PermissionAction.WRITE,
    resource: PermissionResource.API_KEYS,
    description: 'Create and manage API keys',
  },
  'delete:api-keys': {
    name: 'delete:api-keys',
    action: PermissionAction.DELETE,
    resource: PermissionResource.API_KEYS,
    description: 'Revoke API keys',
  },

  // Webhook permissions
  'read:webhooks': {
    name: 'read:webhooks',
    action: PermissionAction.READ,
    resource: PermissionResource.WEBHOOKS,
    description: 'Read webhook configurations',
  },
  'write:webhooks': {
    name: 'write:webhooks',
    action: PermissionAction.WRITE,
    resource: PermissionResource.WEBHOOKS,
    description: 'Create and modify webhook configurations',
  },
  'delete:webhooks': {
    name: 'delete:webhooks',
    action: PermissionAction.DELETE,
    resource: PermissionResource.WEBHOOKS,
    description: 'Delete webhooks',
  },

  // Notification permissions
  'read:notifications': {
    name: 'read:notifications',
    action: PermissionAction.READ,
    resource: PermissionResource.NOTIFICATIONS,
    description: 'Read notification settings',
  },
  'write:notifications': {
    name: 'write:notifications',
    action: PermissionAction.WRITE,
    resource: PermissionResource.NOTIFICATIONS,
    description: 'Configure notifications (Slack, PagerDuty, email)',
  },

  // User permissions
  'read:users': {
    name: 'read:users',
    action: PermissionAction.READ,
    resource: PermissionResource.USERS,
    description: 'Read user information',
  },
  'write:users': {
    name: 'write:users',
    action: PermissionAction.WRITE,
    resource: PermissionResource.USERS,
    description: 'Invite users, update user info',
  },
  'delete:users': {
    name: 'delete:users',
    action: PermissionAction.DELETE,
    resource: PermissionResource.USERS,
    description: 'Remove users from organization',
  },

  // Role permissions (RBAC)
  'read:roles': {
    name: 'read:roles',
    action: PermissionAction.READ,
    resource: PermissionResource.ROLES,
    description: 'Read RBAC roles and permissions',
  },
  'manage:roles': {
    name: 'manage:roles',
    action: PermissionAction.MANAGE,
    resource: PermissionResource.ROLES,
    description: 'Create, modify, and delete custom RBAC roles',
  },
  'write:role-assignments': {
    name: 'write:role-assignments',
    action: PermissionAction.WRITE,
    resource: PermissionResource.RBAC,
    description: 'Assign roles to users',
  },

  // Settings permissions
  'read:settings': {
    name: 'read:settings',
    action: PermissionAction.READ,
    resource: PermissionResource.SETTINGS,
    description: 'Read organization settings',
  },
  'write:settings': {
    name: 'write:settings',
    action: PermissionAction.WRITE,
    resource: PermissionResource.SETTINGS,
    description: 'Modify organization settings',
  },

  // Policy permissions
  'read:policies': {
    name: 'read:policies',
    action: PermissionAction.READ,
    resource: PermissionResource.POLICIES,
    description: 'Read policies and policy manifests',
  },
  'write:policies': {
    name: 'write:policies',
    action: PermissionAction.WRITE,
    resource: PermissionResource.POLICIES,
    description: 'Create and modify policies',
  },

  // Gate permissions (DSG)
  'execute:gates': {
    name: 'execute:gates',
    action: PermissionAction.EXECUTE,
    resource: PermissionResource.GATES,
    description: 'Execute deterministic gates',
  },

  // Proof permissions (DSG)
  'execute:proofs': {
    name: 'execute:proofs',
    action: PermissionAction.EXECUTE,
    resource: PermissionResource.PROOFS,
    description: 'Execute deterministic proofs',
  },

  // Usage permissions
  'read:usage': {
    name: 'read:usage',
    action: PermissionAction.READ,
    resource: PermissionResource.USAGE,
    description: 'Read usage metrics and dashboards',
  },

  // SSO permissions
  'manage:sso': {
    name: 'manage:sso',
    action: PermissionAction.MANAGE,
    resource: PermissionResource.SSO,
    description: 'Configure SAML/OIDC SSO and group mappings',
  },

  // Compliance permissions
  'read:compliance': {
    name: 'read:compliance',
    action: PermissionAction.READ,
    resource: PermissionResource.COMPLIANCE,
    description: 'Read compliance and audit reports',
  },
};

/**
 * Define default roles with their permission sets
 */
export const DEFAULT_ROLES = {
  admin: {
    name: 'admin',
    description: 'Full access to all organization resources',
    permissions: ['*'],
  },
  operator: {
    name: 'operator',
    description: 'Operational access: read all, manage API keys, webhooks, audit',
    permissions: [
      'read:*',
      'write:api-keys',
      'delete:api-keys',
      'write:webhooks',
      'delete:webhooks',
      'write:notifications',
      'export:audit',
    ],
  },
  viewer: {
    name: 'viewer',
    description: 'Read-only access to organization resources',
    permissions: ['read:*'],
  },
};

/**
 * Check if a permission matches a pattern
 * @param permission Permission string (e.g., "read:audit")
 * @param pattern Pattern to match (e.g., "read:*", "*")
 * @returns true if permission matches pattern
 */
export function permissionMatches(permission: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === permission) return true;

  // Handle wildcard patterns like "read:*" or "*:audit"
  const [patternAction, patternResource] = pattern.split(':');
  const [permAction, permResource] = permission.split(':');

  if (patternAction === '*' || patternAction === permAction) {
    if (patternResource === '*' || patternResource === permResource) {
      return true;
    }
  }

  return false;
}

/**
 * Validate if a permission string is valid
 * @param permission Permission string
 * @returns true if valid, false otherwise
 */
export function isValidPermission(permission: string): boolean {
  if (permission === '*') return true;
  return permission in PERMISSIONS || /^[a-z]+:\*$/.test(permission) || /^\*:[a-z\-]+$/.test(permission);
}

/**
 * Check if user has a specific permission
 * @param userPermissions User's permission list
 * @param requiredPermission Required permission
 * @returns true if user has permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.some((perm) => permissionMatches(requiredPermission, perm));
}

/**
 * Expand permission wildcards to actual permissions
 * @param permissions Permission list (may contain wildcards)
 * @returns Expanded list of explicit permissions
 */
export function expandPermissions(permissions: string[]): string[] {
  const expanded = new Set<string>();

  for (const perm of permissions) {
    if (perm === '*') {
      // Add all available permissions
      Object.keys(PERMISSIONS).forEach((p) => expanded.add(p));
    } else if (perm.includes('*')) {
      // Wildcard pattern - match against all permissions
      Object.keys(PERMISSIONS).forEach((p) => {
        if (permissionMatches(p, perm)) {
          expanded.add(p);
        }
      });
    } else {
      // Explicit permission
      expanded.add(perm);
    }
  }

  return Array.from(expanded);
}
