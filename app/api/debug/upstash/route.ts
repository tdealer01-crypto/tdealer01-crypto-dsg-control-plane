// Temporary diagnostic endpoint — remove after Upstash is confirmed live in production.
// Returns Upstash connectivity status and env var presence without exposing secret values.
import { isRateLimiterConfigured } from '../../../../lib/security/rate-limit';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const configured = isRateLimiterConfigured();

  let pingResult: string | null = null;
  let pingError: string | null = null;

  if (url && token) {
    try {
      const res = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.json();
      pingResult = JSON.stringify(body);
    } catch (e) {
      pingError = e instanceof Error ? e.message : String(e);
    }
  }

  return Response.json({
    configured,
    url_set: !!url,
    url_prefix: url ? url.slice(0, 20) + '…' : null,
    token_set: !!token,
    token_length: token?.length ?? 0,
    ping: pingResult,
    ping_error: pingError,
  });
}
