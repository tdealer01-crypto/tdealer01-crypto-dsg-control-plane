// Operator-only diagnostic endpoint for Upstash production connectivity.
// Returns env presence and Redis ping status without exposing secret values.
// Access is intentionally hidden behind a shared operator token.
import { isRateLimiterConfigured } from '../../../../lib/security/rate-limit';

const OPERATOR_HEADER = 'x-dsg-operator-token';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.DSG_OPERATOR_TOKEN;
  const provided = request.headers.get(OPERATOR_HEADER);

  if (!expected || !provided) return false;
  return timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

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
