export type DsgSupabaseRpcConfig = {
  url: string;
  key: string;
  userAccessToken?: string;
};

export type DsgRpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type EnvResolution = {
  value?: string;
  names: string[];
};

function firstEnv(names: string[]): EnvResolution {
  for (const name of names) {
    const value = process.env[name];
    if (value) return { value, names };
  }
  return { names };
}

export function getDsgSupabaseRpcConfig(userAccessToken?: string): DsgSupabaseRpcConfig {
  const url = firstEnv([
    'DSG_ONE_V1_SUPABASE_URL',
    'NEXT_PUBLIC_DSG_ONE_V1_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
  ]);
  const key = firstEnv([
    'DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]);

  if (!url.value) throw new Error(`DSG_SUPABASE_URL_REQUIRED:${url.names.join('|')}`);
  if (!key.value) throw new Error(`DSG_SUPABASE_KEY_REQUIRED:${key.names.join('|')}`);

  return { url: url.value.replace(/\/$/, ''), key: key.value, userAccessToken };
}


function isLegacySupabaseApiKey(key: string): boolean {
  // Legacy anon/service_role keys are JWTs and must also be sent as Bearer.
  // Modern sb_publishable_ and sb_secret_ keys authenticate via apikey only.
  return !key.startsWith('sb_publishable_') && !key.startsWith('sb_secret_');
}

function buildSupabaseHeaders(
  config: DsgSupabaseRpcConfig,
): Record<string, string> {
  const bearer = config.userAccessToken
    ?? (isLegacySupabaseApiKey(config.key) ? config.key : undefined);

  return {
    apikey: config.key,
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
  };
}

function parseJsonBody<T>(text: string): T | DsgRpcError | null {
  return text ? (JSON.parse(text) as T | DsgRpcError) : null;
}

export async function callDsgRpc<T>(
  config: DsgSupabaseRpcConfig,
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      ...buildSupabaseHeaders(config),
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = parseJsonBody<T>(await response.text());

  if (!response.ok) {
    const error = payload as DsgRpcError | null;
    throw new Error(error?.message ?? `DSG_RPC_${response.status}`);
  }

  return payload as T;
}

export async function readDsgRest<T>(
  config: DsgSupabaseRpcConfig,
  tableName: string,
  searchParams: Record<string, string>,
): Promise<T> {
  const url = new URL(`${config.url}/rest/v1/${tableName}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      ...buildSupabaseHeaders(config),
      Accept: 'application/json',
      'Accept-Profile': 'public',
    },
    cache: 'no-store',
  });

  const payload = parseJsonBody<T>(await response.text());

  if (!response.ok) {
    const error = payload as DsgRpcError | null;
    throw new Error(error?.message ?? `DSG_REST_${response.status}`);
  }

  return payload as T;
}

export function getBearerToken(headers: Headers): string | undefined {
  const value = headers.get('authorization');
  if (!value?.toLowerCase().startsWith('bearer ')) return undefined;
  return value.slice('bearer '.length).trim();
}
