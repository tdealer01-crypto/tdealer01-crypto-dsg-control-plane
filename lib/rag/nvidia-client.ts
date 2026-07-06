import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RagMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RagChatRequest {
  messages: RagMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  collection_name?: string;
  top_k?: number;
}

export interface RagCitation {
  document: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RagChatResponse {
  choices: Array<{
    message: RagMessage;
    finish_reason: string;
    index: number;
  }>;
  citations?: {
    total_results: number;
    results: RagCitation[];
  };
  metrics?: {
    retrieval_latency_ms: number;
    generation_latency_ms: number;
    total_latency_ms: number;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RagSearchRequest {
  query: string;
  collection_name: string;
  top_k?: number;
  threshold?: number;
}

export interface RagSearchResponse {
  total_results: number;
  results: RagCitation[];
}

export class NvidiaRagClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    baseUrl: string = process.env.NVIDIA_RAG_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: string = process.env.NVIDIA_API_KEY || ''
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
    };
  }

  async chat(request: RagChatRequest): Promise<RagChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messages: request.messages,
        model: request.model || 'nvidia/llama-3.1-nemotron-70b-instruct',
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2048,
        stream: request.stream ?? false,
        extra_body: {
          collection_name: request.collection_name || 'dsg-docs',
          top_k: request.top_k ?? 5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RAG API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async search(request: RagSearchRequest): Promise<RagSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        query: request.query,
        collection_name: request.collection_name,
        top_k: request.top_k ?? 5,
        threshold: request.threshold ?? 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RAG search error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Alias for OpenAI-compatible chat completions endpoint
  async generate(request: RagChatRequest): Promise<RagChatResponse> {
    return this.chat(request);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ragClient = new NvidiaRagClient();