import { getSupabaseAdmin } from '../supabase-server';

type KeyType = 'ip' | 'email' | 'org_id';

export async function consumeRateLimit(input: { scope: string; keyType: KeyType; keyValue: string; windowSeconds: number; maxAttempts: number }) {
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - input.windowSeconds * 1000).toISOString();
  const { data, error } = await admin.from('rate_limit_events').select('id,created_at').eq('scope', input.scope).eq('key_type', input.keyType).eq('key_value', input.keyValue).gte('created_at', windowStart).order('created_at', { ascending: true });
  if (error) throw error;
  const count = (data || []).length;
  if (count >= input.maxAttempts) {
    const first = (data || [])[0] as any;
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(first.created_at).getTime() + input.windowSeconds * 1000 - now) / 1000));
    return { allowed: false, count, remaining: 0, retryAfterSeconds };
  }
  const { error: insertError } = await admin.from('rate_limit_events').insert({ scope: input.scope, key_type: input.keyType, key_value: input.keyValue });
  if (insertError) throw insertError;
  return { allowed: true, count: count + 1, remaining: Math.max(0, input.maxAttempts - count - 1), retryAfterSeconds: 0 };
}

export function rateLimitJson(status: number, message: string, retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: message, retry_after_seconds: retryAfterSeconds }), { status, headers: { 'content-type': 'application/json', 'retry-after': String(retryAfterSeconds) } });
}
