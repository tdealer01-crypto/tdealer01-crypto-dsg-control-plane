/**
 * SAML 2.0 Handler
 *
 * Parses and validates SAML 2.0 assertions for user authentication.
 * Implements basic SAML parsing (full production implementation would use samlify or similar).
 */

export interface SamlAssertion {
  issuer: string;
  subject: string;
  sessionIndex: string;
  notOnOrAfter: string;
  attributes: Record<string, string | string[]>;
}

export interface SamlValidationResult {
  valid: boolean;
  assertion?: SamlAssertion;
  error?: string;
}

/**
 * Extract email from SAML attributes
 */
export function extractEmailFromSamlAssertion(attributes: Record<string, string | string[]>): string | null {
  // Try common SAML attribute names for email
  const emailAttrs = ['email', 'emailAddress', 'mail', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

  for (const attr of emailAttrs) {
    const value = attributes[attr];
    if (value) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return null;
}

/**
 * Extract display name from SAML attributes
 */
export function extractDisplayNameFromSamlAssertion(attributes: Record<string, string | string[]>): string | null {
  // Try common SAML attribute names
  const nameAttrs = [
    'displayName',
    'name',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  ];

  for (const attr of nameAttrs) {
    const value = attributes[attr];
    if (value) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return null;
}

/**
 * Extract groups from SAML attributes
 */
export function extractGroupsFromSamlAssertion(attributes: Record<string, string | string[]>): string[] {
  // Try common SAML attribute names for groups
  const groupAttrs = ['groups', 'memberOf', 'http://schemas.xmlsoap.org/claims/Group'];

  for (const attr of groupAttrs) {
    const value = attributes[attr];
    if (value) {
      return Array.isArray(value) ? value : [value];
    }
  }

  return [];
}

/**
 * Validate SAML assertion structure
 * In production, use a proper SAML library (samlify) to verify signatures
 */
export function validateSamlAssertion(
  assertion: SamlAssertion,
  expectedIssuer: string,
  nowMs: number = Date.now(),
): SamlValidationResult {
  const errors: string[] = [];

  // Validate issuer
  if (assertion.issuer !== expectedIssuer) {
    errors.push(`Invalid issuer: expected ${expectedIssuer}, got ${assertion.issuer}`);
  }

  // Validate subject exists
  if (!assertion.subject) {
    errors.push('SAML assertion missing subject');
  }

  // Validate expiration
  if (assertion.notOnOrAfter) {
    const expiresMs = new Date(assertion.notOnOrAfter).getTime();
    if (expiresMs < nowMs) {
      errors.push('SAML assertion has expired');
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, assertion };
}

/**
 * Parse SAML XML response (simplified, for production use proper library)
 * This is a basic parser that extracts key elements
 */
export function parseSamlResponse(samlXml: string): SamlAssertion | null {
  try {
    // Extract Issuer
    const issuerMatch = samlXml.match(/<Issuer[^>]*>([^<]+)<\/Issuer>/);
    const issuer = issuerMatch ? issuerMatch[1] : '';

    // Extract NameID (subject)
    const nameIdMatch = samlXml.match(/<NameID[^>]*>([^<]+)<\/NameID>/);
    const subject = nameIdMatch ? nameIdMatch[1] : '';

    // Extract SessionIndex
    const sessionMatch = samlXml.match(/SessionIndex="([^"]+)"/);
    const sessionIndex = sessionMatch ? sessionMatch[1] : '';

    // Extract NotOnOrAfter
    const notOnOrAfterMatch = samlXml.match(/NotOnOrAfter="([^"]+)"/);
    const notOnOrAfter = notOnOrAfterMatch ? notOnOrAfterMatch[1] : '';

    // Extract attributes
    const attributes: Record<string, string | string[]> = {};
    const attrMatches = samlXml.matchAll(
      /<Attribute\s+Name="([^"]+)"\s*>(?:<AttributeValue[^>]*>([^<]*)<\/AttributeValue>)+<\/Attribute>/g,
    );

    for (const match of attrMatches) {
      const attrName = match[1];
      // Re-extract all AttributeValue elements for this attribute
      const valueMatches = samlXml.matchAll(
        new RegExp(`<Attribute\\s+Name="${attrName}"[^>]*>(?:<AttributeValue[^>]*>([^<]*)<\\/AttributeValue>)+<\\/Attribute>`, 'g'),
      );

      const values: string[] = [];
      for (const vm of valueMatches) {
        const valuesInGroup = samlXml
          .match(
            new RegExp(`<Attribute\\s+Name="${attrName}"[^>]*>([^<]*(?:<AttributeValue[^>]*>[^<]*<\\/AttributeValue>[^<]*)*)`, 'g'),
          )?.[0]
          ?.matchAll(/<AttributeValue[^>]*>([^<]*)<\/AttributeValue>/g);

        if (valuesInGroup) {
          for (const v of valuesInGroup) {
            values.push(v[1]);
          }
        }
      }

      attributes[attrName] = values.length > 1 ? values : values[0] || '';
    }

    return { issuer, subject, sessionIndex, notOnOrAfter, attributes };
  } catch (error) {
    console.error('[saml-parse] Error parsing SAML:', error);
    return null;
  }
}

/**
 * Generate SAML metadata XML for service provider
 */
export function generateSamlMetadata(
  entityId: string,
  assertionConsumerServiceUrl: string,
  singleLogoutServiceUrl?: string,
): string {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">

    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>

    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${assertionConsumerServiceUrl}"
      index="0"
      isDefault="true" />

    ${singleLogoutServiceUrl ? `<SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${singleLogoutServiceUrl}" />` : ''}

  </SPSSODescriptor>

  <Organization>
    <OrganizationName>DSG Control Plane</OrganizationName>
    <OrganizationDisplayName>DSG Control Plane</OrganizationDisplayName>
    <OrganizationURL>https://dsg.pics</OrganizationURL>
  </Organization>

  <ContactPerson contactType="technical">
    <EmailAddress>support@dsg.pics</EmailAddress>
  </ContactPerson>
</EntityDescriptor>`;
}

/**
 * Build SAML AuthnRequest URL
 */
export function buildSamlAuthnRequestUrl(
  idpSsoUrl: string,
  entityId: string,
  assertionConsumerServiceUrl: string,
  relayState?: string,
): string {
  const params = new URLSearchParams({
    SAMLRequest: Buffer.from(
      `<AuthnRequest xmlns="urn:oasis:names:tc:SAML:2.0:protocol" Version="2.0" IssueInstant="${new Date().toISOString()}" Destination="${idpSsoUrl}" AssertionConsumerServiceURL="${assertionConsumerServiceUrl}" Issuer="${entityId}"><NameIDPolicy Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent" AllowCreate="true"/></AuthnRequest>`,
    ).toString('base64'),
  });

  if (relayState) {
    params.append('RelayState', relayState);
  }

  return `${idpSsoUrl}?${params.toString()}`;
}
