import { describe, expect, it } from 'vitest';
import { verifyVercelPreview } from '@/lib/dsg/app-builder/vercel-preview-proof';

describe('vercel preview proof', () => {
  it('blocks missing token', () => {
    const result = verifyVercelPreview({
      projectId: 'prj_123',
      deploymentUrl: 'https://example.vercel.app',
      deploymentStatus: 'ready',
      healthPassed: true,
    });
    expect(result.status).toBe('BLOCK');
    expect(result.reason).toBe('MISSING_VERCEL_TOKEN');
  });

  it('blocks missing URL', () => {
    const result = verifyVercelPreview({ token: 't', projectId: 'p', deploymentStatus: 'ready', healthPassed: true });
    expect(result.status).toBe('BLOCK');
    expect(result.reason).toBe('MISSING_PREVIEW_URL');
  });

  it('url alone is preview_deployed at most and never pass', () => {
    const result = verifyVercelPreview({ token: 't', projectId: 'p', deploymentUrl: 'https://example.vercel.app', deploymentStatus: 'building' });
    expect(result.status).toBe('PREVIEW_DEPLOYED');
    expect(result.status).not.toBe('PASS');
  });

  it('ready deployment + health pass returns PASS', () => {
    const result = verifyVercelPreview({
      token: 't',
      projectId: 'p',
      deploymentUrl: 'https://example.vercel.app',
      deploymentStatus: 'ready',
      healthPassed: true,
    });
    expect(result.status).toBe('PASS');
  });

  it('health failure blocks PASS', () => {
    const result = verifyVercelPreview({
      token: 't',
      projectId: 'p',
      deploymentUrl: 'https://example.vercel.app',
      deploymentStatus: 'ready',
      healthPassed: false,
    });
    expect(result.status).toBe('PREVIEW_DEPLOYED');
    expect(result.reason).toBe('HEALTHCHECK_FAILED');
  });

  it('proofHash is deterministic', () => {
    const input = {
      token: 't',
      projectId: 'p',
      deploymentUrl: 'https://example.vercel.app',
      deploymentStatus: 'ready',
      healthPassed: true,
      deploymentId: 'dpl_123',
    };
    const one = verifyVercelPreview(input);
    const two = verifyVercelPreview(input);
    expect(one.proofHash).toBe(two.proofHash);
    expect(one.proofHash.startsWith('sha256:')).toBe(true);
  });

  it('caller booleans are not accepted as proof', () => {
    const result = verifyVercelPreview({
      token: 't',
      projectId: 'p',
      deploymentUrl: 'https://example.vercel.app',
      ...( { vercel_pass: true, health_pass: true } as Record<string, unknown>),
    });
    expect(result.status).toBe('BLOCK');
    expect(result.reason).toBe('MISSING_DEPLOYMENT_STATUS');
  });
});
