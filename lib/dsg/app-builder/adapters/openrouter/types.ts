export type OpenRouterRole = 'system' | 'user' | 'assistant';

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
};

export type OpenRouterCallInput = {
  messages: OpenRouterMessage[];
  model?: string;
  fallbackModels?: string[];
  temperature?: number;
  maxTokens?: number;
};

export type OpenRouterCallSuccess = {
  ok: true;
  model: string;
  content: string;
  attempts: Array<{ model: string; status: number }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type OpenRouterCallFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  attempts: Array<{ model: string; status?: number; error?: string }>;
};

export type OpenRouterCallResult = OpenRouterCallSuccess | OpenRouterCallFailure;
