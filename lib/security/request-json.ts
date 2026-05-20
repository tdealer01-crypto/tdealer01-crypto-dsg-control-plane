export type JsonParseResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function readJsonBody<T = unknown>(
  request: Request,
  options?: { maxBytes?: number },
): Promise<JsonParseResult<T>> {
  const maxBytes = options?.maxBytes ?? 64_000;
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413, error: 'payload_too_large' };
  }

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return { ok: false, status: 400, error: 'invalid_body' };
  }

  if (raw.length === 0) {
    return { ok: false, status: 400, error: 'empty_body' };
  }

  if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
    return { ok: false, status: 413, error: 'payload_too_large' };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }
}

export function jsonSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function maxObjectDepth(value: unknown, maxDepth = 8): boolean {
  function visit(node: unknown, depth: number): boolean {
    if (depth > maxDepth) return false;
    if (node === null || typeof node !== 'object') return true;
    if (Array.isArray(node)) return node.every((item) => visit(item, depth + 1));
    return Object.values(node as Record<string, unknown>).every((item) => visit(item, depth + 1));
  }

  return visit(value, 0);
}
