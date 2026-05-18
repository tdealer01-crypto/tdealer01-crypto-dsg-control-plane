// Typed HTTP client for calling dsg-one-v1 from control-plane.
// Auth: forwards the user's Supabase JWT (same project = same token).

export type DsgJob = {
  id: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  workspaceId: string;
  actorId: string;
  createdAt: string;
  completedAt?: string;
};

function dsgBaseUrl(): string {
  const url = process.env.DSG_ONE_V1_URL;
  if (!url) throw new Error('DSG_ONE_V1_URL is not configured');
  return url.replace(/\/$/, '');
}

function authHeaders(token: string, workspaceId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-dsg-workspace-id': workspaceId,
  };
}

async function dsgFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${dsgBaseUrl()}${path}`, { ...init, cache: 'no-store' });
  const body = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string };
  } | null;
  if (!res.ok) throw new Error(body?.error?.code ?? `DSG_HTTP_${res.status}`);
  return body?.data as T;
}

export async function createDsgJob(
  token: string,
  workspaceId: string,
  goal: string,
  successCriteria?: unknown[],
): Promise<DsgJob> {
  return dsgFetch<DsgJob>('/api/dsg/jobs', {
    method: 'POST',
    headers: authHeaders(token, workspaceId),
    body: JSON.stringify({ goal, successCriteria }),
  });
}

export async function listDsgJobs(token: string, workspaceId: string): Promise<DsgJob[]> {
  const data = await dsgFetch<{ jobs: DsgJob[] }>('/api/dsg/jobs', {
    headers: authHeaders(token, workspaceId),
  });
  return data.jobs;
}

export async function getDsgJob(
  token: string,
  workspaceId: string,
  jobId: string,
): Promise<DsgJob> {
  return dsgFetch<DsgJob>(`/api/dsg/jobs/${jobId}`, {
    headers: authHeaders(token, workspaceId),
  });
}
