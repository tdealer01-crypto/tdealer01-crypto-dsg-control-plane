import { createHash } from 'crypto';

export type CanonicalInput =
  | string
  | number
  | boolean
  | null
  | CanonicalInput[]
  | { [key: string]: CanonicalInput | undefined };

function sortValue(value: CanonicalInput): CanonicalInput {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, CanonicalInput> = {};
    for (const key of Object.keys(value).sort()) {
      const child = (value as Record<string, CanonicalInput | undefined>)[key];
      if (typeof child !== 'undefined') {
        sorted[key] = sortValue(child);
      }
    }
    return sorted;
  }

  return value;
}

export function canonicalJson(value: CanonicalInput): string {
  return JSON.stringify(sortValue(value));
}

export function canonicalHash(value: CanonicalInput): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
