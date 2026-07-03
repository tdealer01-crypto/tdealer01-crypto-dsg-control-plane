import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OpenRouterClient,
  getOpenRouterClient,
  resetOpenRouterClient,
} from '../../lib/openrouter/client';
import { UsageTracker } from '../../lib/openrouter/usage-tracker';

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;

  beforeEach(() => {
    resetOpenRouterClient();
    client = new OpenRouterClient({
      apiKey: 'sk-or-test-key',
      primaryModel: 'anthropic/claude-3.5-haiku',
      fallbackModels: [
        'mistralai/mistral-7b-instruct',
        'meta-llama/llama-2-7b-chat',
      ],
      timeout: 5000,
      maxRetries: 2,
    });
  });

  describe('initialization', () => {
    it('should initialize with provided config', () => {
      expect(client.getPrimaryModel()).toBe('anthropic/claude-3.5-haiku');
      expect(client.getFallbackModels()).toEqual([
        'mistralai/mistral-7b-instruct',
        'meta-llama/llama-2-7b-chat',
      ]);
    });

    it('should get model chain in correct order', () => {
      const chain = client.getModelChain();
      expect(chain).toEqual([
        'anthropic/claude-3.5-haiku',
        'mistralai/mistral-7b-instruct',
        'meta-llama/llama-2-7b-chat',
      ]);
    });
  });

  describe('switchPrimaryModel', () => {
    it('should switch to new primary model', () => {
      client.switchPrimaryModel('mistralai/mistral-7b-instruct');
      expect(client.getPrimaryModel()).toBe('mistralai/mistral-7b-instruct');
    });

    it('should throw error on empty model', () => {
      expect(() => client.switchPrimaryModel('')).toThrow();
    });
  });

  describe('completion request', () => {
    it('should build completion request with defaults', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'test-id',
              created: Date.now(),
              model: 'anthropic/claude-3.5-haiku',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Test response',
                  },
                  finishReason: 'stop',
                  index: 0,
                },
              ],
              usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );

      const response = await client.complete({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Test response');
      expect(response.usage.totalTokens).toBe(30);

      fetchMock.mockRestore();
    });

    it('should send correct headers to OpenRouter', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'test-id',
              created: Date.now(),
              model: 'anthropic/claude-3.5-haiku',
              choices: [
                {
                  message: { role: 'assistant', content: 'Test' },
                  finishReason: 'stop',
                  index: 0,
                },
              ],
              usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            }),
            { status: 200 }
          )
        );

      await client.callModel('anthropic/claude-3.5-haiku', {
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: 'test' }],
      });

      const call = fetchMock.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;

      expect(headers.Authorization).toContain('Bearer sk-or-test-key');
      expect(headers['HTTP-Referer']).toBe('https://dsg-one');
      expect(headers['X-Title']).toBe('DSG AI Runtime');

      fetchMock.mockRestore();
    });
  });

  describe('fallback chain', () => {
    it('should try fallback when primary fails', async () => {
      let callCount = 0;
      const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Primary model fails
          return new Response(
            JSON.stringify({ error: { message: 'Model overloaded' } }),
            { status: 503 }
          );
        } else {
          // Fallback succeeds
          return new Response(
            JSON.stringify({
              id: 'test-id',
              created: Date.now(),
              model: 'mistralai/mistral-7b-instruct',
              choices: [
                {
                  message: { role: 'assistant', content: 'Fallback response' },
                  finishReason: 'stop',
                  index: 0,
                },
              ],
              usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
            }),
            { status: 200 }
          );
        }
      });

      const response = await client.complete({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Fallback response');
      expect(callCount).toBe(2); // One failure + one success

      fetchMock.mockRestore();
    });

    it('should exhaust all models before throwing', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Model unavailable' } }),
          { status: 503 }
        )
      );

      await expect(
        client.complete({
          model: 'anthropic/claude-3.5-haiku',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow('All models failed');

      // Should try: primary + 2 fallbacks = 3 calls
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);

      fetchMock.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication error', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: 'Invalid authentication credentials' },
          }),
          { status: 401 }
        )
      );

      await expect(
        client.callModel('anthropic/claude-3.5-haiku', {
          model: 'anthropic/claude-3.5-haiku',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow('Invalid authentication credentials');

      fetchMock.mockRestore();
    });

    it('should handle 404 model not found', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Model not found' } }),
          { status: 404 }
        )
      );

      await expect(
        client.callModel('invalid/model', {
          model: 'invalid/model',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow();

      fetchMock.mockRestore();
    });

    it('should handle network timeout', async () => {
      const fetchMock = vi
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Network timeout'));

      await expect(
        client.callModel('anthropic/claude-3.5-haiku', {
          model: 'anthropic/claude-3.5-haiku',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow('Network timeout');

      fetchMock.mockRestore();
    });
  });

  describe('connection test', () => {
    it('should successfully test connection', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'test-id',
            created: Date.now(),
            model: 'anthropic/claude-3.5-haiku',
            choices: [
              {
                message: { role: 'assistant', content: 'pong' },
                finishReason: 'stop',
                index: 0,
              },
            ],
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          }),
          { status: 200 }
        )
      );

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.model).toBe('anthropic/claude-3.5-haiku');
      expect(result.latency).toBeGreaterThanOrEqual(0);

      fetchMock.mockRestore();
    });

    it('should report failed connection', async () => {
      const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: 'Unauthorized' },
          }),
          { status: 401 }
        )
      );

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unauthorized');

      fetchMock.mockRestore();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      // Set up environment variables
      process.env.OPENROUTER_API_KEY = 'sk-or-test';
      process.env.AI_PRIMARY_MODEL = 'anthropic/claude-3.5-haiku';
      process.env.AI_FALLBACK_MODELS = 'mistralai/mistral-7b-instruct';

      const client1 = getOpenRouterClient();
      const client2 = getOpenRouterClient();

      expect(client1).toBe(client2);

      resetOpenRouterClient();
    });

    it('should reset singleton', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test';
      process.env.AI_PRIMARY_MODEL = 'anthropic/claude-3.5-haiku';
      process.env.AI_FALLBACK_MODELS = '';

      const client1 = getOpenRouterClient();
      resetOpenRouterClient();
      const client2 = getOpenRouterClient();

      expect(client1).not.toBe(client2);
    });
  });
});

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it('should track single usage record', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(1);
    expect(stats.totalTokens).toBe(150);
  });

  it('should accumulate multiple records', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    tracker.track('mistralai/mistral-7b-instruct', 200, 100);
    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(2);
    expect(stats.totalTokens).toBe(450); // 150 + 300
  });

  it('should track usage per model', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    tracker.track('mistralai/mistral-7b-instruct', 200, 100);

    const stats = tracker.getStats();

    expect(stats.byModel['anthropic/claude-3.5-haiku'].requests).toBe(2);
    expect(stats.byModel['anthropic/claude-3.5-haiku'].tokens).toBe(300);
    expect(stats.byModel['mistralai/mistral-7b-instruct'].requests).toBe(1);
  });

  it('should calculate cost correctly', () => {
    // Claude Haiku: $0.8 per 1k tokens
    tracker.track('anthropic/claude-3.5-haiku', 1000, 1000);
    const stats = tracker.getStats();

    // 2000 tokens * (0.8 / 1000) = $1.60
    expect(stats.totalCost).toBeCloseTo(1.6, 2);
  });

  it('should reset all data', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    tracker.reset();
    const stats = tracker.getStats();

    expect(stats.totalRequests).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(stats.totalCost).toBe(0);
  });

  it('should export data', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    const exported = tracker.export();

    expect(exported.records.length).toBe(1);
    expect(exported.stats.totalRequests).toBe(1);
    expect(exported.exportedAt).toBeDefined();
  });

  it('should import data', () => {
    tracker.track('anthropic/claude-3.5-haiku', 100, 50);
    const exported = tracker.export();

    const tracker2 = new UsageTracker();
    tracker2.import(exported);

    expect(tracker2.getStats().totalRequests).toBe(1);
    expect(tracker2.getStats().totalTokens).toBe(150);
  });
});
