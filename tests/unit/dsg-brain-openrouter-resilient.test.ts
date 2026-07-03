/**
 * Tests for OpenRouter Resilient Caller with Automatic Fallback to Free Models
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  callHermesAPIResilient,
  isRecoverableError,
  formatHermesError,
} from '@/lib/dsg/brain/hermes-api-resilient';
import {
  detectFreeModels,
  shouldFallbackOnError,
  getModelFallbackList,
  clearFreeModelsCache,
} from '@/lib/dsg/brain/openrouter-free-models';

// Mock fetch
global.fetch = vi.fn();

describe('OpenRouter Free Models Detection', () => {
  beforeEach(() => {
    clearFreeModelsCache();
    vi.clearAllMocks();
  });

  it('should detect free models from OpenRouter API', async () => {
    const mockModels = [
      {
        id: 'mistral-7b:free',
        name: 'Mistral 7B',
        pricing: { prompt: 0, completion: 0 },
        context_length: 32000,
      },
      {
        id: 'hermes-3-70b',
        name: 'Hermes 3 70B',
        pricing: { prompt: 0.1, completion: 0.2 }, // Not free
        context_length: 8000,
      },
      {
        id: 'neural-chat:free',
        name: 'Neural Chat Free',
        pricing: { prompt: 0, completion: 0 },
        context_length: 16000,
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockModels }),
    });

    const freeModels = await detectFreeModels();
    expect(freeModels).toContain('mistral-7b:free');
    expect(freeModels).toContain('neural-chat:free');
    expect(freeModels).not.toContain('hermes-3-70b');
    expect(freeModels.length).toBe(2);
  });

  it('should fallback to known models if API fails', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const freeModels = await detectFreeModels();
    expect(freeModels).toContain('mistral-7b-instruct:free');
    expect(freeModels).toContain('neural-chat-7b-v3:free');
  });

  it('should return ordered model fallback list', async () => {
    const mockModels = [
      { id: 'free-1', pricing: { prompt: 0, completion: 0 } },
      { id: 'free-2', pricing: { prompt: 0, completion: 0 } },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockModels }),
    });

    const list = await getModelFallbackList('primary-model');
    expect(list[0]).toBe('primary-model');
    expect(list).toContain('free-1');
    expect(list).toContain('free-2');
  });
});

describe('Error Classification', () => {
  it('should identify quota errors as recoverable', () => {
    expect(shouldFallbackOnError(429, 'Too many requests')).toBe(true);
  });

  it('should identify model-not-found errors as recoverable', () => {
    expect(shouldFallbackOnError(404, 'Model not found')).toBe(true);
  });

  it('should identify service-unavailable as recoverable', () => {
    expect(shouldFallbackOnError(503, 'Service Unavailable')).toBe(true);
  });

  it('should identify unsupported model as recoverable', () => {
    expect(shouldFallbackOnError(400, 'Model is unsupported')).toBe(true);
  });

  it('should not fallback on auth errors', () => {
    expect(shouldFallbackOnError(401, 'Unauthorized')).toBe(false);
  });

  it('should not fallback on validation errors', () => {
    expect(shouldFallbackOnError(400, 'Invalid request')).toBe(false);
  });
});

describe('Resilient API Caller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearFreeModelsCache();
  });

  it('should succeed on first attempt', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'success', role: 'assistant' } }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await callHermesAPIResilient(
      'https://api.test.com',
      'Bearer test-key',
      [{ role: 'user', content: 'test' }],
      [],
      'test-model',
      1024,
      undefined,
      { maxRetries: 3, enableFallback: false }
    );

    expect(result.choices[0].message.content).toBe('success');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient failures', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'success', role: 'assistant' } }],
    };

    // Fail first 2 times, then succeed
    const error = new Error('Timeout');
    (error as any).statusCode = 500;
    (error as any).errorText = 'Internal Server Error';

    (global.fetch as any)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    const result = await callHermesAPIResilient(
      'https://api.test.com',
      'Bearer test-key',
      [{ role: 'user', content: 'test' }],
      [],
      'test-model',
      1024,
      undefined,
      { maxRetries: 3, initialDelayMs: 10, enableFallback: false }
    );

    expect(result.choices[0].message.content).toBe('success');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should fallback to free models on quota exceeded', async () => {
    const error429 = new Error('Quota exceeded');
    (error429 as any).statusCode = 429;
    (error429 as any).errorText = 'Too Many Requests';

    const mockResponse = {
      choices: [{ message: { content: 'success from free model', role: 'assistant' } }],
    };

    const mockModels = [
      { id: 'free-model', pricing: { prompt: 0, completion: 0 } },
    ];

    // Primary fails with 429, then fallback succeeds
    (global.fetch as any)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    const result = await callHermesAPIResilient(
      'https://api.test.com',
      'Bearer test-key',
      [{ role: 'user', content: 'test' }],
      [],
      'primary-model',
      1024,
      { 'HTTP-Referer': 'https://example.com' },
      { maxRetries: 1, enableFallback: true }
    );

    expect(result.choices[0].message.content).toBe('success from free model');
  });

  it('should throw after exhausting all attempts', async () => {
    const error = new Error('API error');
    (error as any).statusCode = 500;
    (error as any).errorText = 'Server error';

    (global.fetch as any)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    await expect(
      callHermesAPIResilient(
        'https://api.test.com',
        'Bearer test-key',
        [{ role: 'user', content: 'test' }],
        [],
        'primary-model',
        1024,
        undefined,
        { maxRetries: 2, initialDelayMs: 1, enableFallback: false }
      )
    ).rejects.toThrow('exhausted all retries');
  });
});

describe('Error Formatting', () => {
  it('should format error with status code', () => {
    const error = new Error('API error');
    (error as any).statusCode = 429;
    (error as any).errorText = 'Too many requests';

    const formatted = formatHermesError(error);
    expect(formatted).toContain('429');
    expect(formatted).toContain('API error');
  });

  it('should handle errors without status code', () => {
    const error = new Error('Network timeout');
    const formatted = formatHermesError(error);
    expect(formatted).toBe('Network timeout');
  });

  it('should detect recoverable errors', () => {
    const error = new Error('API error');
    (error as any).statusCode = 429;

    expect(isRecoverableError(error)).toBe(true);
  });
});
