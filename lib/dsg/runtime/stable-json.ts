export function normalizeForStableJson(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => normalizeForStableJson(item));
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      const item = input[key];
      if (typeof item !== 'undefined') output[key] = normalizeForStableJson(item);
    }
    return output;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers cannot be encoded deterministically');
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableJson(value));
}
