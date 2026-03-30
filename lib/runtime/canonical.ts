import { createHash } from 'crypto';

export function normalizeCanonical(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCanonical(item));
  }

  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(input).sort()) {
    const v = input[key];
    if (v === undefined) continue;
    out[key] = normalizeCanonical(v);
  }

  return out;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalizeCanonical(value));
}

export function sha256Hex(value: unknown): string {
  const content = typeof value === 'string' ? value : canonicalStringify(value);
  return createHash('sha256').update(content).digest('hex');
}
