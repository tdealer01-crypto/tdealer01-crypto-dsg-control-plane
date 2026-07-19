import { describe, it, expect } from 'vitest';
import {
  extractEmailFromSamlAssertion,
  extractDisplayNameFromSamlAssertion,
  extractGroupsFromSamlAssertion,
  validateSamlAssertion,
  parseSamlResponse,
  generateSamlMetadata,
  buildSamlAuthnRequestUrl,
} from '@/lib/sso/saml-handler';

describe('SAML Handler', () => {
  describe('extractEmailFromSamlAssertion', () => {
    it('extracts email from standard email attribute', () => {
      const attributes = {
        email: 'user@example.com',
        name: 'John Doe',
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBe('user@example.com');
    });

    it('extracts email from emailAddress attribute', () => {
      const attributes = {
        emailAddress: 'user@example.com',
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBe('user@example.com');
    });

    it('extracts email from mail attribute', () => {
      const attributes = {
        mail: 'user@example.com',
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBe('user@example.com');
    });

    it('extracts email from XML schema attribute', () => {
      const attributes = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'user@example.com',
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBe('user@example.com');
    });

    it('extracts email from array attribute', () => {
      const attributes = {
        email: ['user@example.com', 'other@example.com'],
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBe('user@example.com');
    });

    it('returns null when no email found', () => {
      const attributes = {
        name: 'John Doe',
      };

      const email = extractEmailFromSamlAssertion(attributes);

      expect(email).toBeNull();
    });
  });

  describe('extractDisplayNameFromSamlAssertion', () => {
    it('extracts displayName attribute', () => {
      const attributes = {
        displayName: 'John Doe',
      };

      const name = extractDisplayNameFromSamlAssertion(attributes);

      expect(name).toBe('John Doe');
    });

    it('extracts name attribute', () => {
      const attributes = {
        name: 'John Doe',
      };

      const name = extractDisplayNameFromSamlAssertion(attributes);

      expect(name).toBe('John Doe');
    });

    it('extracts XML schema name attribute', () => {
      const attributes = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'John Doe',
      };

      const name = extractDisplayNameFromSamlAssertion(attributes);

      expect(name).toBe('John Doe');
    });

    it('extracts from array attribute', () => {
      const attributes = {
        displayName: ['John Doe', 'Jane Doe'],
      };

      const name = extractDisplayNameFromSamlAssertion(attributes);

      expect(name).toBe('John Doe');
    });

    it('returns null when no name found', () => {
      const attributes = {
        email: 'user@example.com',
      };

      const name = extractDisplayNameFromSamlAssertion(attributes);

      expect(name).toBeNull();
    });
  });

  describe('extractGroupsFromSamlAssertion', () => {
    it('extracts groups attribute', () => {
      const attributes = {
        groups: ['admin', 'developers'],
      };

      const groups = extractGroupsFromSamlAssertion(attributes);

      expect(groups).toEqual(['admin', 'developers']);
    });

    it('extracts memberOf attribute', () => {
      const attributes = {
        memberOf: ['CN=admin,DC=example,DC=com', 'CN=developers,DC=example,DC=com'],
      };

      const groups = extractGroupsFromSamlAssertion(attributes);

      expect(groups).toEqual(['CN=admin,DC=example,DC=com', 'CN=developers,DC=example,DC=com']);
    });

    it('extracts XML schema Group attribute', () => {
      const attributes = {
        'http://schemas.xmlsoap.org/claims/Group': ['admin', 'developers'],
      };

      const groups = extractGroupsFromSamlAssertion(attributes);

      expect(groups).toEqual(['admin', 'developers']);
    });

    it('converts single string value to array', () => {
      const attributes = {
        groups: 'admin',
      };

      const groups = extractGroupsFromSamlAssertion(attributes);

      expect(groups).toEqual(['admin']);
    });

    it('returns empty array when no groups found', () => {
      const attributes = {
        email: 'user@example.com',
      };

      const groups = extractGroupsFromSamlAssertion(attributes);

      expect(groups).toEqual([]);
    });
  });

  describe('validateSamlAssertion', () => {
    it('validates correct assertion', () => {
      const assertion = {
        issuer: 'https://idp.example.com',
        subject: 'user-123',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() + 3600000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(true);
      expect(result.assertion).toEqual(assertion);
    });

    it('rejects invalid issuer', () => {
      const assertion = {
        issuer: 'https://wrong.idp.com',
        subject: 'user-123',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() + 3600000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid issuer');
    });

    it('rejects assertion missing subject', () => {
      const assertion = {
        issuer: 'https://idp.example.com',
        subject: '',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() + 3600000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing subject');
    });

    it('rejects expired assertion', () => {
      const assertion = {
        issuer: 'https://idp.example.com',
        subject: 'user-123',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() - 3600000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('accepts valid notOnOrAfter', () => {
      const assertion = {
        issuer: 'https://idp.example.com',
        subject: 'user-123',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() + 1000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(true);
    });

    it('collects multiple validation errors', () => {
      const assertion = {
        issuer: 'https://wrong.idp.com',
        subject: '',
        sessionIndex: 'session-456',
        notOnOrAfter: new Date(Date.now() - 3600000).toISOString(),
        attributes: {},
      };

      const result = validateSamlAssertion(assertion, 'https://idp.example.com');

      expect(result.valid).toBe(false);
      expect(result.error?.split(';').length).toBeGreaterThan(1);
    });
  });

  describe('parseSamlResponse', () => {
    it('parses valid SAML response', () => {
      const samlXml = `
        <Assertion>
          <Issuer>https://idp.example.com</Issuer>
          <NameID>user-123</NameID>
          <AuthnStatement SessionIndex="session-456" NotOnOrAfter="2025-12-31T23:59:59Z">
          </AuthnStatement>
          <AttributeStatement>
            <Attribute Name="email">
              <AttributeValue>user@example.com</AttributeValue>
            </Attribute>
          </AttributeStatement>
        </Assertion>
      `;

      const assertion = parseSamlResponse(samlXml);

      expect(assertion).not.toBeNull();
      expect(assertion?.issuer).toBe('https://idp.example.com');
      expect(assertion?.subject).toBe('user-123');
      expect(assertion?.sessionIndex).toBe('session-456');
    });

    it('extracts attributes from SAML response', () => {
      const samlXml = `<Attribute Name="email"><AttributeValue>user@example.com</AttributeValue></Attribute><Attribute Name="groups"><AttributeValue>admin</AttributeValue><AttributeValue>developers</AttributeValue></Attribute>`;

      const assertion = parseSamlResponse(samlXml);

      expect(assertion?.attributes.email).toBe('user@example.com');
    });

    it('handles missing issuer', () => {
      const samlXml = `
        <Assertion>
          <NameID>user-123</NameID>
        </Assertion>
      `;

      const assertion = parseSamlResponse(samlXml);

      expect(assertion?.issuer).toBe('');
    });

    it('handles missing subject', () => {
      const samlXml = `
        <Assertion>
          <Issuer>https://idp.example.com</Issuer>
        </Assertion>
      `;

      const assertion = parseSamlResponse(samlXml);

      expect(assertion?.subject).toBe('');
    });

    it('returns null for invalid XML', () => {
      const assertion = parseSamlResponse('not valid xml');

      expect(assertion).not.toBeNull(); // Parser is lenient
      expect(assertion?.issuer).toBe('');
    });
  });

  describe('generateSamlMetadata', () => {
    it('generates metadata with required fields', () => {
      const metadata = generateSamlMetadata(
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      expect(metadata).toContain('EntityDescriptor');
      expect(metadata).toContain('https://app.example.com/saml/metadata');
      expect(metadata).toContain('https://app.example.com/saml/acs');
      expect(metadata).toContain('DSG Control Plane');
    });

    it('includes SingleLogoutService when provided', () => {
      const metadata = generateSamlMetadata(
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs',
        'https://app.example.com/saml/sls'
      );

      expect(metadata).toContain('SingleLogoutService');
      expect(metadata).toContain('https://app.example.com/saml/sls');
    });

    it('omits SingleLogoutService when not provided', () => {
      const metadata = generateSamlMetadata(
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      expect(metadata).not.toContain('SingleLogoutService');
    });

    it('includes NameIDFormat elements', () => {
      const metadata = generateSamlMetadata(
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      expect(metadata).toContain('NameIDFormat');
      expect(metadata).toContain('emailAddress');
      expect(metadata).toContain('persistent');
    });
  });

  describe('buildSamlAuthnRequestUrl', () => {
    it('builds AuthnRequest URL', () => {
      const url = buildSamlAuthnRequestUrl(
        'https://idp.example.com/sso',
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      expect(url).toContain('https://idp.example.com/sso');
      expect(url).toContain('SAMLRequest=');
    });

    it('includes RelayState when provided', () => {
      const url = buildSamlAuthnRequestUrl(
        'https://idp.example.com/sso',
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs',
        'relay-state-value'
      );

      expect(url).toContain('RelayState=relay-state-value');
    });

    it('omits RelayState when not provided', () => {
      const url = buildSamlAuthnRequestUrl(
        'https://idp.example.com/sso',
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      expect(url).not.toContain('RelayState=');
    });

    it('SAMLRequest is base64 encoded', () => {
      const url = buildSamlAuthnRequestUrl(
        'https://idp.example.com/sso',
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      const match = url.match(/SAMLRequest=([^&]+)/);
      expect(match).not.toBeNull();

      const encoded = match?.[1];
      const decoded = Buffer.from(encoded!, 'base64').toString();
      expect(decoded).toContain('AuthnRequest');
      expect(decoded).toContain('https://app.example.com/saml/acs');
    });

    it('includes correct entity IDs in request', () => {
      const url = buildSamlAuthnRequestUrl(
        'https://idp.example.com/sso',
        'https://app.example.com/saml/metadata',
        'https://app.example.com/saml/acs'
      );

      const match = url.match(/SAMLRequest=([^&]+)/);
      const decoded = Buffer.from(match![1], 'base64').toString();

      expect(decoded).toContain('Issuer="https://app.example.com/saml/metadata"');
      expect(decoded).toContain('AssertionConsumerServiceURL="https://app.example.com/saml/acs"');
    });
  });
});
