import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdminMock = vi.fn();
const sendGitHubLeadOutreachMock = vi.fn(async () => undefined);

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock('../../../lib/email/sales', () => ({
  sendGitHubLeadOutreach: sendGitHubLeadOutreachMock,
  sendGitHubLeadFollowup: vi.fn(async () => undefined),
  sendLeadWelcome: vi.fn(async () => undefined),
}));

const ORIGINAL_MODE = process.env.MARKETING_OUTREACH_MODE;

function mockAdmin(overrides: { insertError?: { code?: string; message?: string } | null } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: overrides.insertError ?? null });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
  getSupabaseAdminMock.mockReturnValue({
    from: vi.fn(() => ({ insert, update })),
  });
  return { insert };
}

describe('outreach policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_MODE === undefined) delete process.env.MARKETING_OUTREACH_MODE;
    else process.env.MARKETING_OUTREACH_MODE = ORIGINAL_MODE;
  });

  it('defaults to queue when env is unset or invalid', async () => {
    delete process.env.MARKETING_OUTREACH_MODE;
    const { getOutreachMode } = await import('../../../lib/marketing/outreach-policy');
    expect(getOutreachMode()).toBe('queue');

    process.env.MARKETING_OUTREACH_MODE = 'yolo';
    expect(getOutreachMode()).toBe('queue');
  });

  it('resolves auto and off explicitly', async () => {
    const { getOutreachMode } = await import('../../../lib/marketing/outreach-policy');
    process.env.MARKETING_OUTREACH_MODE = 'auto';
    expect(getOutreachMode()).toBe('auto');
    process.env.MARKETING_OUTREACH_MODE = 'OFF';
    expect(getOutreachMode()).toBe('off');
  });

  it('queue mode: send_outreach_to_lead queues instead of sending', async () => {
    process.env.MARKETING_OUTREACH_MODE = 'queue';
    const { insert } = mockAdmin();
    const { executeTool } = await import('../../../lib/marketing/mcp-tools');

    const result = await executeTool('send_outreach_to_lead', {
      email: 'lead@example.com',
      framework: 'langchain',
      github_repo: 'acme/agent',
      github_stars: 120,
    }) as { ok?: boolean; queued?: boolean };

    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(sendGitHubLeadOutreachMock).not.toHaveBeenCalled();
  });

  it('off mode: send_outreach_to_lead refuses', async () => {
    process.env.MARKETING_OUTREACH_MODE = 'off';
    mockAdmin();
    const { executeTool } = await import('../../../lib/marketing/mcp-tools');

    const result = await executeTool('send_outreach_to_lead', {
      email: 'lead@example.com',
      framework: 'langchain',
      github_repo: 'acme/agent',
    }) as { error?: string };

    expect(result.error).toContain('disabled');
    expect(sendGitHubLeadOutreachMock).not.toHaveBeenCalled();
  });

  it('auto mode: send_outreach_to_lead sends immediately', async () => {
    process.env.MARKETING_OUTREACH_MODE = 'auto';
    mockAdmin();
    const { executeTool } = await import('../../../lib/marketing/mcp-tools');

    const result = await executeTool('send_outreach_to_lead', {
      email: 'lead@example.com',
      framework: 'crewai',
      github_repo: 'acme/agent',
    }) as { ok?: boolean; queued?: boolean };

    expect(result.ok).toBe(true);
    expect(result.queued).toBeUndefined();
    expect(sendGitHubLeadOutreachMock).toHaveBeenCalledTimes(1);
  });

  it('queue mode: duplicate pending lead (23505) is treated as queued', async () => {
    process.env.MARKETING_OUTREACH_MODE = 'queue';
    mockAdmin({ insertError: { code: '23505', message: 'duplicate' } });
    const { executeTool } = await import('../../../lib/marketing/mcp-tools');

    const result = await executeTool('send_outreach_to_lead', {
      email: 'lead@example.com',
      framework: 'autogen',
      github_repo: 'acme/agent',
    }) as { ok?: boolean; queued?: boolean };

    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
  });
});
