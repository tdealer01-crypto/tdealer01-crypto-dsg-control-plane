import type { LaunchpadLaunch, LaunchpadSection } from './types';

type LaunchpadClientOptions = {
  baseUrl?: string;
  accessToken: string;
  workspaceId: string;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string };
};

function normalizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return '';
  return baseUrl.replace(/\/$/, '');
}

export function createLaunchpadClient(options: LaunchpadClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.accessToken}`,
        'x-dsg-workspace-id': options.workspaceId,
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok || !payload?.ok || payload.data === undefined) {
      const code = payload?.error?.code ?? `LAUNCHPAD_HTTP_${response.status}`;
      throw new Error(code);
    }

    return payload.data;
  }

  return {
    async list(): Promise<LaunchpadLaunch[]> {
      const data = await request<{ launches: LaunchpadLaunch[] }>('/api/dsg/launchpad/launches');
      return data.launches;
    },

    async create(input: { name: string; sections: LaunchpadSection[] }): Promise<LaunchpadLaunch> {
      const data = await request<{ launch: LaunchpadLaunch }>('/api/dsg/launchpad/launches', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data.launch;
    },

    async update(
      id: string,
      patch: { name?: string; sections?: LaunchpadSection[] },
    ): Promise<LaunchpadLaunch> {
      const data = await request<{ launch: LaunchpadLaunch }>(
        `/api/dsg/launchpad/launches/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      return data.launch;
    },

    async remove(id: string): Promise<string> {
      const data = await request<{ id: string }>(
        `/api/dsg/launchpad/launches/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      return data.id;
    },
  };
}
