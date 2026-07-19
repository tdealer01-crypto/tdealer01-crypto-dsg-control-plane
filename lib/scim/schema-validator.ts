/**
 * SCIM 2.0 Schema Validator (RFC 7643)
 *
 * Validates SCIM 2.0 requests and responses according to RFC 7643 specification.
 */

export interface ScimUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  photos?: Array<{ value: string; type?: string }>;
  emails: Array<{ value: string; type?: string; primary?: boolean }>;
  addresses?: Array<{
    formatted?: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  ims?: Array<{ value: string; type?: string }>;
  locale?: string;
  timezone?: string;
  active?: boolean;
  password?: string;
  groups?: Array<{ value: string; $ref?: string; display?: string }>;
  entitlements?: Array<{ value: string; display?: string }>;
  roles?: Array<{ value: string; display?: string }>;
  x_dsg_org_id?: string;
  x_dsg_rbac_role_id?: string;
  meta?: {
    resourceType: string;
    created?: string;
    lastModified?: string;
    location?: string;
    version?: string;
  };
}

export interface ScimListResponse {
  schemas: string[];
  totalResults: number;
  itemsPerPage: number;
  startIndex: number;
  Resources: ScimUser[];
}

export interface ScimError {
  schemas: string[];
  detail: string;
  status: number;
}

const SCIM_SCHEMA_URI = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCIM_ERROR_SCHEMA_URI = 'urn:ietf:params:scim:api:messages:2.0:Error';
const SCIM_LIST_SCHEMA_URI = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

/**
 * Validate SCIM User object
 */
export function validateScimUser(user: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!user.userName || typeof user.userName !== 'string') {
    errors.push('userName is required and must be a string');
  }

  if (!user.emails || !Array.isArray(user.emails) || user.emails.length === 0) {
    errors.push('emails is required and must be a non-empty array');
  } else {
    user.emails.forEach((email: any, idx: number) => {
      if (!email.value || typeof email.value !== 'string') {
        errors.push(`emails[${idx}].value is required and must be a string`);
      }
      if (!email.value.includes('@')) {
        errors.push(`emails[${idx}].value must be a valid email address`);
      }
    });
  }

  // Validate schemas
  if (!user.schemas || !Array.isArray(user.schemas)) {
    errors.push('schemas is required and must be an array');
  } else if (!user.schemas.includes(SCIM_SCHEMA_URI)) {
    errors.push(`schemas must include ${SCIM_SCHEMA_URI}`);
  }

  // Validate optional fields
  if (user.name && typeof user.name === 'object') {
    if (user.name.givenName && typeof user.name.givenName !== 'string') {
      errors.push('name.givenName must be a string');
    }
    if (user.name.familyName && typeof user.name.familyName !== 'string') {
      errors.push('name.familyName must be a string');
    }
  }

  if (user.active !== undefined && typeof user.active !== 'boolean') {
    errors.push('active must be a boolean');
  }

  if (user.locale && typeof user.locale !== 'string') {
    errors.push('locale must be a string');
  }

  if (user.timezone && typeof user.timezone !== 'string') {
    errors.push('timezone must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build SCIM User response object
 */
export function buildScimUserResponse(
  userId: string,
  userName: string,
  email: string,
  orgId: string,
  options: Partial<ScimUser> = {},
): ScimUser {
  const now = new Date().toISOString();

  return {
    schemas: [SCIM_SCHEMA_URI],
    id: userId,
    externalId: options.externalId,
    userName,
    displayName: options.displayName || userName,
    emails: [{ value: email, type: 'work', primary: true }],
    active: options.active !== undefined ? options.active : true,
    locale: options.locale || 'en-US',
    timezone: options.timezone || 'UTC',
    x_dsg_org_id: orgId,
    x_dsg_rbac_role_id: options.x_dsg_rbac_role_id,
    meta: {
      resourceType: 'User',
      created: options.meta?.created || now,
      lastModified: options.meta?.lastModified || now,
      location: `/api/scim/v2/Users/${userId}`,
      version: 'W/"1"',
    },
  };
}

/**
 * Build SCIM list response
 */
export function buildScimListResponse(
  resources: ScimUser[],
  startIndex: number = 1,
  itemsPerPage: number = 20,
): ScimListResponse {
  return {
    schemas: [SCIM_LIST_SCHEMA_URI],
    totalResults: resources.length,
    itemsPerPage,
    startIndex,
    Resources: resources,
  };
}

/**
 * Build SCIM error response
 */
export function buildScimError(message: string, status: number = 400): ScimError {
  return {
    schemas: [SCIM_ERROR_SCHEMA_URI],
    detail: message,
    status,
  };
}

/**
 * Parse SCIM filter string (basic support)
 * Example: 'userName eq "user@example.com"' or 'active eq true'
 */
export function parseScimFilter(filter: string): { field: string; operator: string; value: string } | null {
  const match = filter.match(/^(\w+)\s+(eq|ne|co|sw|ew)\s+(?:"([^"]*)"|([^\s]+))$/i);
  if (!match) return null;

  return {
    field: match[1],
    operator: match[2].toLowerCase(),
    value: match[3] || match[4] || '',
  };
}

/**
 * Check if filter matches user
 */
export function filterMatches(user: ScimUser, filter: { field: string; operator: string; value: string }): boolean {
  let fieldValue: string | boolean | undefined;

  if (filter.field === 'userName') {
    fieldValue = user.userName;
  } else if (filter.field === 'active') {
    fieldValue = user.active;
  } else if (filter.field === 'displayName') {
    fieldValue = user.displayName;
  } else {
    return false;
  }

  const strValue = String(fieldValue);
  const lowerValue = strValue.toLowerCase();
  const lowerTarget = filter.value.toLowerCase();

  switch (filter.operator) {
    case 'eq':
      return lowerValue === lowerTarget;
    case 'ne':
      return lowerValue !== lowerTarget;
    case 'co':
      return lowerValue.includes(lowerTarget);
    case 'sw':
      return lowerValue.startsWith(lowerTarget);
    case 'ew':
      return lowerValue.endsWith(lowerTarget);
    default:
      return false;
  }
}

/**
 * Validate SCIM filter syntax
 */
export function isValidScimFilter(filter: string): boolean {
  return /^\w+\s+(eq|ne|co|sw|ew)\s+/.test(filter);
}
