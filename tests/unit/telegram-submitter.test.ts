import { describe, it, expect, vi } from 'vitest';
import { TelegramSubmitter } from '@/lib/superteam/telegram-submitter';

describe('TelegramSubmitter', () => {
  const mockBotToken = 'test_bot_token_123';

  it('throws error when bot token is missing', () => {
    expect(() => new TelegramSubmitter('')).toThrow('Telegram bot token is required');
  });

  it('initializes with valid bot token', () => {
    const submitter = new TelegramSubmitter(mockBotToken);
    expect(submitter).toBeDefined();
  });

  it('handles submission with mock fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: { message_id: 12345 },
      }),
    });

    const submitter = new TelegramSubmitter(mockBotToken);
    const result = await submitter.submitBounty({
      listingId: 'test-123',
      title: 'Test Bounty',
      reward: 5000,
      rewardToken: 'USDC',
      link: 'https://example.com',
      otherInfo: 'Test info',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('12345');
  });

  it('handles API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        ok: false,
        description: 'Invalid bot token',
      }),
    });

    const submitter = new TelegramSubmitter(mockBotToken);
    const result = await submitter.submitBounty({
      listingId: 'test-123',
      title: 'Test Bounty',
      reward: 5000,
      rewardToken: 'USDC',
      link: 'https://example.com',
      otherInfo: 'Test info',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid bot token');
  });

  it('gets status for message', async () => {
    const submitter = new TelegramSubmitter(mockBotToken);
    const status = await submitter.getStatus('12345');

    expect(status.delivered).toBe(true);
    expect(status.timestamp).toBeDefined();
  });
});
