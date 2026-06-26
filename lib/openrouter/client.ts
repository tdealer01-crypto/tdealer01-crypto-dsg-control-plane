/**
 * OpenRouter AI Client Library
 * Provides typed access to OpenRouter API with model fallback chain support
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface OpenRouterCompletionResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
    index: number;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModels: string[];
  timeout?: number;
  maxRetries?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels: string[];
  private timeout: number;
  private maxRetries: number;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.primaryModel = config.primaryModel;
    this.fallbackModels = config.fallbackModels;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Complete a message using the primary model with fallback chain
   */
  async complete(
    request: OpenRouterCompletionRequest
  ): Promise<OpenRouterCompletionResponse> {
    const models = [this.primaryModel, ...this.fallbackModels];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await this.callModel(model, request);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Model ${model} failed:`,
          lastError.message,
          '- trying fallback'
        );
        continue;
      }
    }

    throw new Error(
      `All models failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Call a specific model
   */
  async callModel(
    model: string,
    request: OpenRouterCompletionRequest
  ): Promise<OpenRouterCompletionResponse> {
    const maxTokens = request.maxTokens || 2048;
    const temperature = request.temperature ?? 0.7;
    const topP = request.topP ?? 1;

    const payload = {
      model: model,
      messages: request.messages,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://dsg-one',
          'X-Title': 'DSG AI Runtime',
        },
        body: JSON.stringify(payload),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as any).error?.message || response.statusText;
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorMessage}`
        );
      }

      const data = await response.json();
      return data as OpenRouterCompletionResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(model?: string): Promise<{
    success: boolean;
    message: string;
    latency: number;
    model: string;
  }> {
    const testModel = model || this.primaryModel;
    const startTime = Date.now();

    try {
      await this.callModel(testModel, {
        model: testModel,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 10,
      });

      return {
        success: true,
        message: `Connected to ${testModel}`,
        latency: Date.now() - startTime,
        model: testModel,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
        model: testModel,
      };
    }
  }

  /**
   * Get current primary model
   */
  getPrimaryModel(): string {
    return this.primaryModel;
  }

  /**
   * Get fallback chain
   */
  getFallbackModels(): string[] {
    return this.fallbackModels;
  }

  /**
   * Switch primary model (useful for load balancing)
   */
  switchPrimaryModel(model: string): void {
    if (!model) throw new Error('Model ID cannot be empty');
    this.primaryModel = model;
  }

  /**
   * Get all available models in fallback order
   */
  getModelChain(): string[] {
    return [this.primaryModel, ...this.fallbackModels];
  }

  /**
   * Create client from environment variables
   */
  static fromEnv(): OpenRouterClient {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const primaryModel = process.env.AI_PRIMARY_MODEL;
    const fallbackModelsStr = process.env.AI_FALLBACK_MODELS;

    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY environment variable is not set'
      );
    }

    if (!primaryModel) {
      throw new Error(
        'AI_PRIMARY_MODEL environment variable is not set'
      );
    }

    const fallbackModels = fallbackModelsStr
      ? fallbackModelsStr.split(',').map((m) => m.trim())
      : [];

    return new OpenRouterClient({
      apiKey,
      primaryModel,
      fallbackModels,
      timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000'),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
    });
  }

  /**
   * Create client from config file
   */
  static fromConfig(config: any): OpenRouterClient {
    const aiConfig = config.ai || config;

    return new OpenRouterClient({
      apiKey: aiConfig.apiKey,
      primaryModel: aiConfig.primaryModel || aiConfig.models?.primary?.id,
      fallbackModels: (aiConfig.fallbackModels || aiConfig.models?.fallbacks || [])
        .map((m: any) => (typeof m === 'string' ? m : m.id))
        .filter((m: any) => m),
      timeout: aiConfig.timeoutMs,
      maxRetries: aiConfig.maxRetries,
    });
  }
}

/**
 * Create a singleton instance from environment
 */
let singletonClient: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!singletonClient) {
    singletonClient = OpenRouterClient.fromEnv();
  }
  return singletonClient;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetOpenRouterClient(): void {
  singletonClient = null;
}
