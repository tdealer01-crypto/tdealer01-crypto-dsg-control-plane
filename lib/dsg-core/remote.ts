import type { DSGCoreAuditEvent, DSGCoreDeterminism, DSGCoreExecutionRequest, DSGCoreHealthResult } from './types';

type RemoteConfig = {
  url: string;
  apiKey: string;
};

function coreHeaders(config: RemoteConfig) {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
  };
}

function parseError(data: any, status: number) {
  return data?.detail || data?.error || `HTTP ${status}`;
}

export async function getRemoteDSGCoreHealth(config: RemoteConfig): Promise<DSGCoreHealthResult> {
  try {
    const response = await fetch(`${config.url}/health`, {
      method: 'GET',
      headers: coreHeaders(config),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      url: config.url,
      ...data,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      url: config.url,
      error: error instanceof Error ? error.message : 'Failed to reach DSG core',
    };
  }
}

export async function executeOnRemoteDSGCore(config: RemoteConfig, payload: DSGCoreExecutionRequest) {
  const response = await fetch(`${config.url}/execute`, {
    method: 'POST',
    headers: coreHeaders(config),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, response.status));
  }

  return data;
}

export async function getRemoteDSGCoreMetrics(config: RemoteConfig) {
  try {
    const response = await fetch(`${config.url}/metrics`, {
      method: 'GET',
      headers: coreHeaders(config),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      ...(response.ok ? { data } : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch DSG core metrics',
    };
  }
}

export async function getRemoteDSGCoreLedger(config: RemoteConfig, limit = 20) {
  try {
    const response = await fetch(`${config.url}/ledger`, {
      method: 'GET',
      headers: coreHeaders(config),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items.slice(0, limit) : [];
    return {
      ok: response.ok,
      items,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: error instanceof Error ? error.message : 'Failed to fetch DSG core ledger',
    };
  }
}

export async function getRemoteDSGCoreAuditEvents(config: RemoteConfig, limit = 20) {
  try {
    const response = await fetch(`${config.url}/audit/events?limit=${limit}`, {
      method: 'GET',
      headers: coreHeaders(config),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));

    let items: DSGCoreAuditEvent[] = [];
    if (Array.isArray((data as any)?.items)) {
      items = (data as any).items;
    } else if (Array.isArray((data as any)?.events)) {
      items = (data as any).events;
    } else if (Array.isArray((data as any)?.data?.items)) {
      items = (data as any).data.items;
    }

    return {
      ok: response.ok,
      items,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      items: [] as DSGCoreAuditEvent[],
      error: error instanceof Error ? error.message : 'Failed to fetch DSG core audit events',
    };
  }
}

export async function getRemoteDSGCoreDeterminism(config: RemoteConfig, sequence: number) {
  try {
    let response = await fetch(`${config.url}/audit/determinism/${sequence}`, {
      method: 'GET',
      headers: coreHeaders(config),
      cache: 'no-store',
    });

    if (response.status === 404) {
      response = await fetch(`${config.url}/audit/determinism?sequence=${sequence}`, {
        method: 'GET',
        headers: coreHeaders(config),
        cache: 'no-store',
      });
    }

    const data = await response.json().catch(() => ({}));
    const determinismData = data && typeof data === 'object' && 'data' in data ? (data as any).data : data;

    return {
      ok: response.ok,
      ...(response.ok ? { data: determinismData as DSGCoreDeterminism } : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch DSG core determinism',
    };
  }
}
