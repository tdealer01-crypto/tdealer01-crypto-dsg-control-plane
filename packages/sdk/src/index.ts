export type DSGDecision = 'ALLOW' | 'BLOCK' | 'REVIEW';

export type DSGExecuteInput = Record<string, unknown>;

export interface DSGExecuteResponse {
  decision: DSGDecision;
  execution_id: string;
  reason?: string;
  [key: string]: unknown;
}

export type DSGEffectStatus = 'succeeded' | 'failed';

export interface DSGCallbackResponse {
  ok: boolean;
  idempotent?: boolean;
}

export interface DSGClientOptions {
  baseUrl: string;
  apiKey: string;
  agentId: string;
  fetchImpl?: typeof fetch;
}

export class DSGClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly agentId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DSGClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.agentId = options.agentId;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(
    action: string,
    input: DSGExecuteInput,
    context?: Record<string, unknown>,
  ): Promise<DSGExecuteResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        agent_id: this.agentId,
        action,
        input,
        context: context ?? {},
      }),
    });

    if (!response.ok) {
      throw await this.readError(response, 'execute failed');
    }

    return (await response.json()) as DSGExecuteResponse;
  }

  async callback(
    effectId: string,
    status: DSGEffectStatus,
    payload?: Record<string, unknown>,
    cookie?: string,
  ): Promise<DSGCallbackResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (cookie) {
      headers.Cookie = cookie;
    }

    const response = await this.fetchImpl(`${this.baseUrl}/api/effect-callback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        effect_id: effectId,
        status,
        payload: payload ?? {},
      }),
    });

    if (!response.ok) {
      throw await this.readError(response, 'callback failed');
    }

    return (await response.json()) as DSGCallbackResponse;
  }

  private async readError(response: Response, fallback: string): Promise<Error> {
    const text = await response.text().catch(() => '');
    const message = text ? `${fallback}: ${text}` : fallback;
    return new Error(`${message} (status ${response.status})`);
  }
}
