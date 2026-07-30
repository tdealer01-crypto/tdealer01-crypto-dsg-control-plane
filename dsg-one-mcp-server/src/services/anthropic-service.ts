import Anthropic from '@anthropic-ai/sdk';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

export interface AnthropicConfig {
  apiKey: string;
}

export class AnthropicService {
  private client: Anthropic;

  constructor(config: AnthropicConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('Missing Anthropic API key');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async createSession(
    model: string,
    budgetTokens?: number,
    systemPrompt?: string
  ): Promise<{ sessionId: string; model: string; maxTokens: number }> {
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: budgetTokens || 4096,
        messages: [
          {
            role: 'user',
            content: systemPrompt || 'Initialize session',
          },
        ],
      });

      return {
        sessionId: response.id || `session-${Date.now()}`,
        model: response.model,
        maxTokens: response.usage.output_tokens + (budgetTokens || 0),
      };
    } catch (error) {
      throw new ValidationError(`Failed to create session: ${String(error)}`);
    }
  }

  async sendMessage(
    sessionId: string,
    message: string,
    maxTokens: number = 1024
  ): Promise<{ response: string; usage: { inputTokens: number; outputTokens: number } }> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      return {
        response: textContent,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw new ValidationError(`Failed to send message: ${String(error)}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      return ['claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];
    } catch (error) {
      throw new ValidationError(`Failed to list models: ${String(error)}`);
    }
  }

  async getUsage(): Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> {
    try {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
    } catch (error) {
      throw new ValidationError(`Failed to get usage: ${String(error)}`);
    }
  }
}
