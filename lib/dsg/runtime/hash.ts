/**
 * DSG runtime canonical hashing.
 *
 * Deterministic SHA-256 over a canonical (stable key order) JSON
 * representation of a value. Pure and reproducible across runs and machines.
 *
 * Mirrors the style of lib/dsg/brain/hash-utils.ts (sha256Hash) but exposes
 * the runtime-facing `sha256Json` name used by executors, seed engine, and
 * skills.
 */

import { createHash } from 'crypto';

/**
 * Recursively sort object keys for stable JSON serialization.
 * Arrays preserve order; plain objects are sorted by key.
 */
function stableSort(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = stableSort((value as Record<string, unknown>)[key]);
  }
  return out;
}

/**
 * Canonical JSON string with stable key ordering.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(stableSort(value));
}

/**
 * SHA-256 hex digest of the canonical JSON representation of `value`.
 */
export function sha256Json(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

/**
 * SHA-256 hex digest of raw string content.
 */
export function sha256Raw(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
