const DSG_ONE_BASE = process.env.DSG_ONE_V1_BASE_URL ?? 'https://dsg-one-v1.vercel.app';
const DSG_ONE_WORKSPACE = process.env.DSG_ONE_V1_WORKSPACE_ID ?? '';

type DsgOneHeaders = {
  'Content-Type': string;
  Authorization: string;
  'x-dsg-workspace-id': string;
};

function buildHeaders(accessToken: string): DsgOneHeaders {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'x-dsg-workspace-id': DSG_ONE_WORKSPACE,
  };
}

async function dsgFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T | null; status: number; error?: string }> {
  try {
    const res = await fetch(`${DSG_ONE_BASE}${path}`, {
      ...init,
      headers: {
        ...buildHeaders(accessToken),
        ...(init?.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data: null, status: res.status, error: (data as any)?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: data as T, status: res.status };
  } catch (err) {
    return { ok: false, data: null, status: 0, error: err instanceof Error ? err.message : 'network_error' };
  }
}

export type DsgJob = {
  jobId?: string;
  id?: string;
  goal: string;
  status?: string;
  successCriteria?: Array<{ description: string }>;
  createdAt?: string;
};

export type AiGatewayRequest = {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools?: unknown[];
  temperature?: number;
  max_tokens?: number;
};

export const dsgOneClient = {
  jobs: {
    create: (accessToken: string, payload: { goal: string; successCriteria?: Array<{ description: string }> }) =>
      dsgFetch<DsgJob>('/api/dsg/jobs', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    list: (accessToken: string) =>
      dsgFetch<{ jobs: DsgJob[] }>('/api/dsg/jobs', accessToken),

    get: (accessToken: string, jobId: string) =>
      dsgFetch<DsgJob>(`/api/dsg/jobs/${jobId}`, accessToken),
  },

  agent: {
    chat: (accessToken: string, payload: Record<string, unknown>) =>
      dsgFetch<unknown>('/api/dsg/agent-chat', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    command: (accessToken: string, payload: Record<string, unknown>) =>
      dsgFetch<unknown>('/api/dsg/agent-runtime/commands', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  ai: {
    gateway: (accessToken: string, payload: AiGatewayRequest) =>
      dsgFetch<unknown>('/api/dsg/ai-gateway', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  tools: {
    call: (accessToken: string, payload: Record<string, unknown>) =>
      dsgFetch<unknown>('/api/dsg/tools', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  codex: {
    // Routes to /api/dsg-bridge/codex — uses codex-mini-latest (free tier eligible)
    run: async (input: string, opts?: { instructions?: string; model?: string; tools?: unknown[]; previousResponseId?: string }) => {
      const res = await fetch('/api/dsg-bridge/codex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          instructions: opts?.instructions,
          model: opts?.model ?? 'codex-mini-latest',
          tools: opts?.tools ?? [{ type: 'code_interpreter' }],
          previous_response_id: opts?.previousResponseId,
        }),
      });
      return res.json() as Promise<{ ok: boolean; response?: unknown; error?: string }>;
    },
  },

  templates: {
    list: (accessToken: string) =>
      dsgFetch<unknown>('/api/dsg/templates', accessToken),
  },

  analytics: {
    get: (accessToken: string) =>
      dsgFetch<unknown>('/api/dsg/analytics', accessToken),
  },
};
