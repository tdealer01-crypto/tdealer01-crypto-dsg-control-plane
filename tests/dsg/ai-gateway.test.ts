import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeDsgAiGatewayRequest, prepareDsgAiGatewayRequest, redactHeaders, redactUrl } from '../../lib/dsg/connectors/ai-gateway';

describe('DSG AI gateway', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('fails closed when the provider secret is missing', () => {
    const prepared = prepareDsgAiGatewayRequest({ provider: 'openai', goal: 'Draft a PRD', prompt: 'Create sections' });
    expect(prepared.ok).toBe(false);
    expect(prepared.status).toBe('blocked');
    expect(prepared.blockedReasons).toContain('SECRET_REQUIRED:OPENAI_API_KEY');
    expect(prepared.decisionFrame.truthBoundary.productionReadyClaim).toBe(false);
  });

  it('prepares a Gemini JSON request with deterministic verification evidence', () => {
    process.env.GEMINI_API_KEY = 'gemini-secret';
    const prepared = prepareDsgAiGatewayRequest({ provider: 'gemini', goal: 'Return a task schema', prompt: 'Return JSON only', mode: 'json' });
    expect(prepared.ok).toBe(true);
    expect(prepared.model).toBe('gemini-2.5-flash');
    expect(prepared.endpoint).toContain('generateContent?key=REDACTED');
    expect(prepared.body.generationConfig).toMatchObject({ responseMimeType: 'application/json' });
    expect(prepared.decisionFrame.verifiedInput.evidence.some((entry) => entry.startsWith('goal_hash:sha256:'))).toBe(true);
    expect(prepared.requestHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('blocks secret-like prompts before network execution', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-secret';
    const result = await executeDsgAiGatewayRequest({ provider: 'anthropic', goal: 'Review deploy', prompt: 'Use this api_key abc123' });
    expect(result.ok).toBe(false);
    expect(result.outputVerification).toBe('blocked_before_call');
    expect(result.prepared.blockedReasons).toContain('secret');
  });

  it('redacts provider credentials from returned execution metadata', async () => {
    process.env.OPENAI_API_KEY = 'openai-secret';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"id":"resp"}' });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await executeDsgAiGatewayRequest({ provider: 'openai', goal: 'Summarize', prompt: 'Summarize this safely' });
    expect(result.ok).toBe(true);
    expect(result.prepared.headers.authorization).toBe('REDACTED');
    expect(fetchMock.mock.calls[0][1]?.headers.authorization).toBe('Bearer openai-secret');
    expect(result.responseBody).toEqual({ id: 'resp' });
    expect(result.outputVerification).toBe('unverified_external_output');
  });

  it('redacts helpers consistently', () => {
    expect(redactHeaders({ authorization: 'Bearer token', 'x-api-key': 'token', 'content-type': 'application/json' })).toEqual({
      authorization: 'REDACTED',
      'x-api-key': 'REDACTED',
      'content-type': 'application/json',
    });
    expect(redactUrl('https://x.test/path?key=abc&other=1')).toBe('https://x.test/path?key=REDACTED&other=1');
  });
});
