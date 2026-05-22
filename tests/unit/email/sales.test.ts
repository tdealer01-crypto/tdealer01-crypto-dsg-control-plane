import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendLeadWelcome,
  sendQuotaAlert,
  sendTrialWelcome,
  sendFounderAlertFirstBlock,
} from '@/lib/email/sales';

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
  } as Response);
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.RESEND_FROM_EMAIL = 'DSG ONE <no-reply@dsg.pics>';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.FOUNDER_EMAIL;
});

function getLastSentPayload() {
  const call = fetchSpy.mock.calls[0];
  return JSON.parse(call[1]?.body as string) as {
    to: string;
    from: string;
    subject: string;
    html: string;
  };
}

describe('sendLeadWelcome', () => {
  it('sends to the provided email with a non-empty subject', async () => {
    await sendLeadWelcome('lead@example.com');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const payload = getLastSentPayload();
    expect(payload.to).toBe('lead@example.com');
    expect(payload.subject).toBeTruthy();
    expect(payload.from).toContain('DSG ONE');
  });
});

describe('sendQuotaAlert', () => {
  it('includes planKey and email in the call', async () => {
    await sendQuotaAlert({
      email: 'user@example.com',
      planKey: 'pro',
      executions: 800,
      included: 1000,
      utilization: 0.8,
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const payload = getLastSentPayload();
    expect(payload.to).toBe('user@example.com');
    expect(payload.subject).toMatch(/80%/);
  });
});

describe('sendTrialWelcome', () => {
  it('includes the formatted trial end date in the html body', async () => {
    const trialEnd = '2026-06-01T00:00:00Z';
    await sendTrialWelcome({ email: 'user@example.com', planKey: 'pro', trialEnd });
    const payload = getLastSentPayload();
    // The date should appear formatted somewhere in the html
    expect(payload.html).toContain('6/1/2026');
    expect(payload.subject).toMatch(/PRO/i);
  });

  it('handles null trialEnd without throwing', async () => {
    await expect(
      sendTrialWelcome({ email: 'user@example.com', planKey: 'starter', trialEnd: null })
    ).resolves.not.toThrow();
  });
});

describe('sendFounderAlertFirstBlock', () => {
  it('sends to FOUNDER_EMAIL and includes orgId and reason in html', async () => {
    process.env.FOUNDER_EMAIL = 'founder@dsg.pics';
    await sendFounderAlertFirstBlock({
      orgId: 'org-123',
      workspaceName: 'Test Workspace',
      email: 'customer@example.com',
      action: 'delete_database',
      reason: 'policy_violation',
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const payload = getLastSentPayload();
    expect(payload.to).toBe('founder@dsg.pics');
    expect(payload.html).toContain('org-123');
    expect(payload.html).toContain('policy_violation');
  });

  it('does not send when FOUNDER_EMAIL is not set', async () => {
    delete process.env.FOUNDER_EMAIL;
    await sendFounderAlertFirstBlock({
      orgId: 'org-123',
      workspaceName: 'Test Workspace',
      email: 'customer@example.com',
      action: 'delete',
      reason: 'unauthorized',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('fire-and-forget safety (no RESEND_API_KEY)', () => {
  it('does not throw when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendLeadWelcome('user@example.com')).resolves.not.toThrow();
    // fetch should not be called without API key
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
