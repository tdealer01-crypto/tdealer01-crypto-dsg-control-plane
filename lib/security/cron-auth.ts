import { NextResponse } from 'next/server';
import { verifyBearerSecret } from './secure-token';

export type CronAuthResult = {
  ok: boolean;
  headers: HeadersInit;
  response: NextResponse;
};

function noOpResponse() {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function requireCronAuth(request: Request, jobName: string): CronAuthResult {
  const normalized = jobName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const jobSecret = process.env[`CRON_${normalized}_SECRET`];
  const jobSecretHash = process.env[`CRON_${normalized}_SECRET_SHA256`];
  const sharedSecret = process.env.CRON_SECRET;
  const sharedSecretHash = process.env.CRON_SECRET_SHA256;
  const headers = { 'Cache-Control': 'no-store' };

  const hasAnySecret = Boolean(jobSecret || jobSecretHash || sharedSecret || sharedSecretHash);
  if (!hasAnySecret) {
    const status = process.env.NODE_ENV === 'production' ? 503 : 401;
    return {
      ok: false,
      headers,
      response: NextResponse.json(
        { error: 'cron_secret_required' },
        { status, headers },
      ),
    };
  }

  const allowed =
    verifyBearerSecret(request, { expected: jobSecret, expectedSha256: jobSecretHash }) ||
    verifyBearerSecret(request, { expected: sharedSecret, expectedSha256: sharedSecretHash });

  if (!allowed) {
    return {
      ok: false,
      headers,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers },
      ),
    };
  }

  return { ok: true, headers, response: noOpResponse() };
}
