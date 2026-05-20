import { createHash, timingSafeEqual } from 'crypto';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function timingSafeStringEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}

export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader) return '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token.trim();
}

export function verifySecretValue(options: {
  provided: string;
  expected?: string | null;
  expectedSha256?: string | null;
}): boolean {
  const provided = options.provided.trim();
  if (!provided) return false;

  const expected = options.expected?.trim();
  if (expected && timingSafeStringEqual(provided, expected)) return true;

  const expectedSha256 = options.expectedSha256?.trim().toLowerCase();
  if (!expectedSha256) return false;
  return timingSafeStringEqual(sha256Hex(provided), expectedSha256);
}

export function verifyBearerSecret(request: Request, options: {
  expected?: string | null;
  expectedSha256?: string | null;
}): boolean {
  return verifySecretValue({
    provided: extractBearerToken(request.headers.get('authorization')),
    expected: options.expected,
    expectedSha256: options.expectedSha256,
  });
}
