import { randomUUID } from 'node:crypto';
import type {
  RemoteAction,
  RemoteActionEnvelope,
  RemoteEndpointResult,
  RemoteExecutionContext,
} from './types';

const DEFAULT_TIMEOUT_MS = 20_000;

export function validateRemoteEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  const isLocalDev =
    process.env.NODE_ENV !== 'production' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1');

  if (url.protocol !== 'https:' && !isLocalDev) {
    throw new Error('remote endpoint must use https');
  }
  if (url.username || url.password) {
    throw new Error('remote endpoint must not embed username/password credentials');
  }
  return url;
}

export async function relayRemoteAction(input: {
  endpoint: string;
  sessionId: string;
  execution: RemoteExecutionContext;
  action: RemoteAction;
  timeoutMs?: number;
}): Promise<{ envelope: RemoteActionEnvelope; result: RemoteEndpointResult }> {
  const endpoint = validateRemoteEndpoint(input.endpoint);
  const envelope: RemoteActionEnvelope = {
    version: 'dsg.remote-action.v1',
    requestId: randomUUID(),
    sessionId: input.sessionId,
    execution: input.execution,
    action: input.action,
    issuedAt: new Date().toISOString(),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-dsg-remote-version': 'dsg.remote-action.v1',
      },
      body: JSON.stringify(envelope),
      signal: controller.signal,
      redirect: 'error',
    });
    const body = (await response.json().catch(() => ({}))) as RemoteEndpointResult;
    if (!response.ok) {
      return {
        envelope,
        result: {
          ok: false,
          error: body.error ?? `remote endpoint returned HTTP ${response.status}`,
          evidence: body.evidence,
          state: body.state,
        },
      };
    }
    return { envelope, result: { ...body, ok: body.ok !== false } };
  } finally {
    clearTimeout(timeout);
  }
}
