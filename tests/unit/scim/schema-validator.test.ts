import { describe, it, expect } from 'vitest';
import {
  validateScimUser,
  buildScimUserResponse,
  buildScimListResponse,
  buildScimError,
  parseScimFilter,
  filterMatches,
  isValidScimFilter,
} from '@/lib/scim/schema-validator';

describe('SCIM Schema Validator', () => {
  describe('validateScimUser', () => {
    it('validates a complete SCIM user', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john.doe@example.com',
        emails: [{ value: 'john.doe@example.com', type: 'work', primary: true }],
        name: { givenName: 'John', familyName: 'Doe' },
        active: true,
        locale: 'en-US',
        timezone: 'UTC',
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects user missing userName', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        emails: [{ value: 'john@example.com' }],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userName is required and must be a string');
    });

    it('rejects user missing emails', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('emails is required and must be a non-empty array');
    });

    it('rejects user with empty emails array', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('emails is required and must be a non-empty array');
    });

    it('validates multiple emails', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [
          { value: 'john@work.com', type: 'work' },
          { value: 'john@personal.com', type: 'personal' },
        ],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(true);
    });

    it('rejects email without @ symbol', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'invalid-email' }],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('emails[0].value must be a valid email address');
    });

    it('rejects missing schemas', () => {
      const user = {
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('schemas is required and must be an array');
    });

    it('rejects wrong schema URI', () => {
      const user = {
        schemas: ['wrong:schema:uri'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('schemas must include'))).toBe(true);
    });

    it('validates optional name fields', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(true);
    });

    it('rejects non-string givenName', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
        name: { givenName: 123 },
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name.givenName must be a string');
    });

    it('validates active field as boolean', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
        active: false,
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(true);
    });

    it('rejects non-boolean active field', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
        active: 'yes',
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('active must be a boolean');
    });

    it('validates locale and timezone', () => {
      const user = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john',
        emails: [{ value: 'john@example.com' }],
        locale: 'fr-FR',
        timezone: 'Europe/Paris',
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(true);
    });

    it('collects multiple errors', () => {
      const user = {
        schemas: ['wrong:schema'],
        userName: 123,
        emails: [{ value: 'invalid' }],
        active: 'yes',
      };

      const result = validateScimUser(user);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('buildScimUserResponse', () => {
    it('builds user response with defaults', () => {
      const response = buildScimUserResponse('user-123', 'john.doe', 'john@example.com', 'org-456');

      expect(response.id).toBe('user-123');
      expect(response.userName).toBe('john.doe');
      expect(response.emails).toEqual([{ value: 'john@example.com', type: 'work', primary: true }]);
      expect(response.active).toBe(true);
      expect(response.locale).toBe('en-US');
      expect(response.timezone).toBe('UTC');
      expect(response.x_dsg_org_id).toBe('org-456');
      expect(response.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
    });

    it('includes custom options in response', () => {
      const response = buildScimUserResponse('user-123', 'john.doe', 'john@example.com', 'org-456', {
        displayName: 'John Doe',
        locale: 'fr-FR',
        active: false,
        x_dsg_rbac_role_id: 'role-789',
      });

      expect(response.displayName).toBe('John Doe');
      expect(response.locale).toBe('fr-FR');
      expect(response.active).toBe(false);
      expect(response.x_dsg_rbac_role_id).toBe('role-789');
    });

    it('sets meta attributes correctly', () => {
      const response = buildScimUserResponse('user-123', 'john.doe', 'john@example.com', 'org-456');

      expect(response.meta).toBeDefined();
      expect(response.meta?.resourceType).toBe('User');
      expect(response.meta?.location).toBe('/api/scim/v2/Users/user-123');
      expect(response.meta?.version).toBe('W/"1"');
      expect(response.meta?.created).toBeDefined();
      expect(response.meta?.lastModified).toBeDefined();
    });
  });

  describe('buildScimListResponse', () => {
    it('builds list response with resources', () => {
      const users = [
        buildScimUserResponse('user-1', 'john', 'john@example.com', 'org-456'),
        buildScimUserResponse('user-2', 'jane', 'jane@example.com', 'org-456'),
      ];

      const response = buildScimListResponse(users);

      expect(response.totalResults).toBe(2);
      expect(response.Resources).toHaveLength(2);
      expect(response.itemsPerPage).toBe(20);
      expect(response.startIndex).toBe(1);
      expect(response.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
    });

    it('respects custom pagination parameters', () => {
      const users = [buildScimUserResponse('user-1', 'john', 'john@example.com', 'org-456')];

      const response = buildScimListResponse(users, 11, 10);

      expect(response.startIndex).toBe(11);
      expect(response.itemsPerPage).toBe(10);
    });
  });

  describe('buildScimError', () => {
    it('builds error response with default status', () => {
      const error = buildScimError('Invalid request');

      expect(error.detail).toBe('Invalid request');
      expect(error.status).toBe(400);
      expect(error.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
    });

    it('builds error response with custom status', () => {
      const error = buildScimError('Resource not found', 404);

      expect(error.detail).toBe('Resource not found');
      expect(error.status).toBe(404);
    });
  });

  describe('parseScimFilter', () => {
    it('parses eq filter with quoted value', () => {
      const filter = parseScimFilter('userName eq "user@example.com"');

      expect(filter).toEqual({
        field: 'userName',
        operator: 'eq',
        value: 'user@example.com',
      });
    });

    it('parses filter with unquoted value', () => {
      const filter = parseScimFilter('active eq true');

      expect(filter).toEqual({
        field: 'active',
        operator: 'eq',
        value: 'true',
      });
    });

    it('parses co (contains) operator', () => {
      const filter = parseScimFilter('displayName co "John"');

      expect(filter?.operator).toBe('co');
      expect(filter?.value).toBe('John');
    });

    it('parses sw (starts with) operator', () => {
      const filter = parseScimFilter('userName sw "admin"');

      expect(filter?.operator).toBe('sw');
    });

    it('parses ew (ends with) operator', () => {
      const filter = parseScimFilter('userName ew "@example.com"');

      expect(filter?.operator).toBe('ew');
    });

    it('parses ne (not equal) operator', () => {
      const filter = parseScimFilter('active ne false');

      expect(filter?.operator).toBe('ne');
    });

    it('returns null for invalid filter', () => {
      const filter = parseScimFilter('invalid filter syntax');

      expect(filter).toBeNull();
    });

    it('returns null for empty string', () => {
      const filter = parseScimFilter('');

      expect(filter).toBeNull();
    });

    it('handles case-insensitive operators', () => {
      const filter = parseScimFilter('userName EQ "user@example.com"');

      expect(filter?.operator).toBe('eq');
    });
  });

  describe('filterMatches', () => {
    const testUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'john.doe@example.com',
      displayName: 'John Doe',
      emails: [{ value: 'john@example.com' }],
      active: true,
    };

    it('matches eq filter on userName', () => {
      const filter = { field: 'userName', operator: 'eq', value: 'john.doe@example.com' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('rejects eq filter with different value', () => {
      const filter = { field: 'userName', operator: 'eq', value: 'jane@example.com' };

      expect(filterMatches(testUser, filter)).toBe(false);
    });

    it('matches co (contains) filter', () => {
      const filter = { field: 'displayName', operator: 'co', value: 'john' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('matches sw (starts with) filter', () => {
      const filter = { field: 'userName', operator: 'sw', value: 'john' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('matches ew (ends with) filter', () => {
      const filter = { field: 'userName', operator: 'ew', value: '@example.com' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('matches ne (not equal) filter', () => {
      const filter = { field: 'active', operator: 'ne', value: 'false' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('performs case-insensitive matches', () => {
      const filter = { field: 'userName', operator: 'eq', value: 'JOHN.DOE@EXAMPLE.COM' };

      expect(filterMatches(testUser, filter)).toBe(true);
    });

    it('returns false for unsupported field', () => {
      const filter = { field: 'unknown', operator: 'eq', value: 'value' };

      expect(filterMatches(testUser, filter)).toBe(false);
    });

    it('returns false for unsupported operator', () => {
      const filter = { field: 'userName', operator: 'lt', value: 'value' };

      expect(filterMatches(testUser, filter)).toBe(false);
    });
  });

  describe('isValidScimFilter', () => {
    it('validates correct filter syntax', () => {
      expect(isValidScimFilter('userName eq "value"')).toBe(true);
      expect(isValidScimFilter('active ne false')).toBe(true);
      expect(isValidScimFilter('displayName co "John"')).toBe(true);
    });

    it('rejects invalid filter syntax', () => {
      expect(isValidScimFilter('invalid syntax')).toBe(false);
      expect(isValidScimFilter('')).toBe(false);
      expect(isValidScimFilter('userName')).toBe(false);
    });
  });
});
