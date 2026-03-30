export type MCPToolConfig = {
  name: string;
  description: string;
  endpoint: string;
  method?: 'POST' | 'GET';
  timeout_ms?: number;
  static_headers?: Record<string, string>;
};

export type MCPToolCall = {
  agent_id: string;
  tool_name: string;
  input?: unknown;
  request_id?: string;
};

const DEFAULT_TIMEOUT_MS = 15000;

function normalizeToolConfig(raw: unknown): MCPToolConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const endpoint = typeof item.endpoint === 'string' ? item.endpoint.trim() : '';

  if (!name || !description || !endpoint) {
    return null;
  }

  const method = item.method === 'GET' ? 'GET' : 'POST';
  const timeoutMs =
    typeof item.timeout_ms === 'number' && Number.isFinite(item.timeout_ms)
      ? Math.max(1000, Math.floor(item.timeout_ms))
      : DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {};
  if (item.static_headers && typeof item.static_headers === 'object') {
    for (const [key, value] of Object.entries(item.static_headers as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) {
        headers[key] = value;
      }
    }
  }

  return {
    name,
    description,
    endpoint,
    method,
    timeout_ms: timeoutMs,
    static_headers: headers,
  };
}

export function getMCPToolRegistry() {
  const raw = process.env.MCP_TOOL_REGISTRY_JSON || '[]';

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] as MCPToolConfig[];
    }

    return parsed
      .map((item) => normalizeToolConfig(item))
      .filter((item): item is MCPToolConfig => Boolean(item));
  } catch {
    return [] as MCPToolConfig[];
  }
}

export function findMCPToolByName(toolName: string) {
  return getMCPToolRegistry().find((item) => item.name === toolName) || null;
}

export async function callMCPTool(tool: MCPToolConfig, payload: MCPToolCall) {
  const controller = new AbortController();
  const timeoutMs = tool.timeout_ms || DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const method = tool.method || 'POST';
    const headers = {
      'Content-Type': 'application/json',
      ...(tool.static_headers || {}),
    };

    const response = await fetch(tool.endpoint, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok
        ? null
        : typeof (data as Record<string, unknown>)?.error === 'string'
          ? String((data as Record<string, unknown>).error)
          : `MCP tool responded with status ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      data: null,
      error: error instanceof Error ? error.message : 'MCP tool call failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}
