type SupabaseRequest = {
  method?: 'GET' | 'POST' | 'PATCH';
  path: string;
  query?: string;
  body?: unknown;
};

function getSupabaseRestConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_SERVER_ENV_REQUIRED:SUPABASE_URL_OR_NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('SUPABASE_SERVER_ENV_REQUIRED:SUPABASE_SERVICE_ROLE_KEY');

  return { url: url.replace(/\/$/, ''), key };
}

export async function supabaseRest<T>(input: SupabaseRequest): Promise<T> {
  const { url, key } = getSupabaseRestConfig();
  const target = `${url}/rest/v1/${input.path}${input.query ?? ''}`;
  const response = await fetch(target, {
    method: input.method ?? 'GET',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : response.statusText;
    throw new Error(message || 'SUPABASE_REST_REQUEST_FAILED');
  }

  return data as T;
}
