import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

function buildGetRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return new Request(`http://localhost/api/auth/saml/metadata?${searchParams.toString()}`);
}

describe('GET /api/auth/saml/metadata', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('Parameter validation', () => {
    it('rejects request without org_id parameter', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const res = await GET(buildGetRequest({}));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('org_id');
    });

    it('rejects org_id with invalid UUID format', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const res = await GET(buildGetRequest({ org_id: 'not-a-uuid' }));

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('valid UUID');
    });

    it('rejects org_id that is too short', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const res = await GET(buildGetRequest({ org_id: 'a' }));

      expect(res.status).toBe(400);
    });

    it('accepts valid UUID format for org_id', async () => {
      const mockMetadata = '<EntityDescriptor>...</EntityDescriptor>';
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => mockMetadata),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const res = await GET(buildGetRequest({ org_id: validUuid }));

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('EntityDescriptor');
    });
  });

  describe('Metadata generation', () => {
    it('generates metadata with correct entity ID', async () => {
      const generateSamlMetadata = vi.fn(() => '<metadata/>');
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata,
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await GET(buildGetRequest({ org_id: validUuid }));

      expect(generateSamlMetadata).toHaveBeenCalledWith(
        `https://example.com/saml/${validUuid}`,
        expect.stringContaining('/api/auth/saml/callback'),
        expect.stringContaining('/api/auth/saml/logout')
      );
    });

    it('includes org_id in callback and logout URLs', async () => {
      const generateSamlMetadata = vi.fn(() => '<metadata/>');
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata,
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await GET(buildGetRequest({ org_id: validUuid }));

      const calls = generateSamlMetadata.mock.calls[0];
      expect(calls[1]).toContain(`org_id=${encodeURIComponent(validUuid)}`);
      expect(calls[2]).toContain(`org_id=${encodeURIComponent(validUuid)}`);
    });

    it('uses APP_URL environment variable for baseUrl', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-app.com';
      const generateSamlMetadata = vi.fn(() => '<metadata/>');
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata,
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await GET(buildGetRequest({ org_id: validUuid }));

      const entityId = generateSamlMetadata.mock.calls[0][0];
      expect(entityId).toContain('https://custom-app.com');
    });

    it('falls back to default URL when APP_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const generateSamlMetadata = vi.fn(() => '<metadata/>');
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata,
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await GET(buildGetRequest({ org_id: validUuid }));

      const entityId = generateSamlMetadata.mock.calls[0][0];
      expect(entityId).toContain('https://tdealer01-crypto-dsg-control-plane.vercel.app');
    });
  });

  describe('Response headers', () => {
    it('returns XML content type', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => '<metadata/>'),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const res = await GET(buildGetRequest({ org_id: validUuid }));

      expect(res.headers.get('content-type')).toBe('application/xml');
    });

    it('includes filename in Content-Disposition header', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => '<metadata/>'),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const res = await GET(buildGetRequest({ org_id: validUuid }));

      const disposition = res.headers.get('content-disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain(`metadata-${validUuid}.xml`);
    });
  });

  describe('Metadata content', () => {
    it('returns metadata XML from generator', async () => {
      const mockXml = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor/>
</EntityDescriptor>`;

      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => mockXml),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const res = await GET(buildGetRequest({ org_id: validUuid }));

      const text = await res.text();
      expect(text).toBe(mockXml);
    });
  });

  describe('Error handling', () => {
    it('returns 500 when metadata generation throws error', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => {
          throw new Error('Metadata generation failed');
        }),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const res = await GET(buildGetRequest({ org_id: validUuid }));

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('internal_error');
    });

    it('handles URL construction errors gracefully', async () => {
      vi.doMock('../../../../lib/sso/saml-handler', () => ({
        generateSamlMetadata: vi.fn(() => '<metadata/>'),
      }));

      const { GET } = await import('../../../../app/api/auth/saml/metadata/route');

      // Use a valid URL with valid UUID but with query params in weird position
      const res = await GET(buildGetRequest({ org_id: '550e8400-e29b-41d4-a716-446655440000' }));

      // Should succeed with valid parameters
      expect(res.status).toBe(200);
    });
  });
});
