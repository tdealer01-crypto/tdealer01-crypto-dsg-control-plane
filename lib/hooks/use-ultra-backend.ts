'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ActionType = 'DYNAMIC_SANDBOX' | 'PROVIDER_API' | 'BROWSER_AGENT';

export interface ActionPayload {
  type: ActionType;
  target: string;
  intent: string;
  generatedCodeOrPayload: string | Record<string, any>;
}

export interface ActionRecord {
  actionId: string;
  type: ActionType;
  target: string;
  intent: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confirmationRequestId: string | null;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  result?: Record<string, any>;
  error?: string;
  message?: string;
  approveUrl?: string;
  rejectUrl?: string;
  instructions?: Record<string, any>;
}

export interface SpineExecution {
  executionId: string;
  agentId?: string;
  status: string;
  command: Record<string, any>;
  result: Record<string, any>;
  executedAt: string;
}

export interface SafeDomManifest {
  manifestId: string;
  sessionId: string;
  frameId: string;
  orgId: string;
  expiresAt: string;
  createdAt: string;
  elementCount: number;
}

function apiBase() {
  if (typeof window === 'undefined') return '';
  return '';
}

async function authHeaders() {
  const env = process.env as Record<string, string | undefined>;
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem(`sb-${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon'}-auth-token`)
      : null;
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

async function handleJson(res: Response) {
  const text = await res.text().catch(() => '');
  try {
    return text ? (JSON.parse(text) as Record<string, any>) : {};
  } catch {
    return { raw: text };
  }
}

export function useUltraBackend() {
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [executions, setExecutions] = useState<SpineExecution[]>([]);
  const [manifests, setManifests] = useState<SafeDomManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [manifestStatus, setManifestStatus] = useState<string>('EMPTY');
  const currentSessionId = useRef(`sess_${Date.now()}`);

  const submitAction = useCallback(async (payload: ActionPayload) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/dsg/v1/actions`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const json = await handleJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const record = json as ActionRecord;
      setActions((prev) => [record, ...prev]);
      return record;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveAction = useCallback(async (actionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/dsg/v1/actions/${encodeURIComponent(actionId)}/approve`, {
        method: 'POST',
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const json = await handleJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const record = json as ActionRecord;
      setActions((prev) => prev.map((a) => (a.actionId === actionId ? record : a)));
      return record;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectAction = useCallback(async (actionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/dsg/v1/actions/${encodeURIComponent(actionId)}/reject`, {
        method: 'POST',
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const json = await handleJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const record = json as ActionRecord;
      setActions((prev) => prev.map((a) => (a.actionId === actionId ? record : a)));
      return record;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/dsg/v1/actions`, { headers: await authHeaders(), cache: 'no-store' });
      const json = await handleJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const records = (json?.actions ?? []) as ActionRecord[];
      setActions(records);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async (sessionId?: string) => {
    const sid = sessionId ?? currentSessionId.current;
    const res = await fetch(`${apiBase()}/api/spine/execute?sessionId=${encodeURIComponent(sid)}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    const json = await handleJson(res);
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    setExecutions((json?.executions ?? []) as SpineExecution[]);
  }, []);

  const buildManifest = useCallback(async (frameUrl: string, frameId?: string) => {
    setLoading(true);
    try {
      const payload: Record<string, any> = { sessionId: currentSessionId.current, frameUrl };
      if (frameId) payload.frameId = frameId;
      const res = await fetch(`${apiBase()}/api/safe-dom/browserbase/build-manifest`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const json = await handleJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await refreshManifests();
      return json;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshManifests = useCallback(async () => {
    const sessionId = currentSessionId.current;
    const res = await fetch(`${apiBase()}/api/safe-dom/browserbase?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    const json = await handleJson(res);
    if (!res.ok) {
      setManifestStatus('ERROR');
      return;
    }
    setManifestStatus(json?.status ?? 'EMPTY');
    setManifests(((json?.manifests ?? []) as SafeDomManifest[]));
  }, []);

  const value = useMemo(
    () => ({
      actions,
      executions,
      manifests,
      loading,
      manifestStatus,
      currentSessionId: currentSessionId.current,
      submitAction,
      approveAction,
      rejectAction,
      refreshActions,
      fetchExecutions,
      buildManifest,
      refreshManifests,
    }),
    [
      actions,
      executions,
      manifests,
      loading,
      manifestStatus,
      submitAction,
      approveAction,
      rejectAction,
      refreshActions,
      fetchExecutions,
      buildManifest,
      refreshManifests,
    ],
  );

  return value;
}
