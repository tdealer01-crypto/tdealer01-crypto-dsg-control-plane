/**
 * Deterministic hash utilities for DSG Brain.
 * All operations are pure and reproducible across runs.
 */

import { createHash } from "crypto";

/**
 * Recursively sort object keys for stable JSON serialization.
 * Arrays are preserved in order; objects are sorted by key.
 */
export function stableJsonSort(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableJsonSort);
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(value).sort();
  for (const key of keys) {
    sortedObj[key] = stableJsonSort((value as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

/**
 * Serialize a value to a canonical JSON string with stable key ordering.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(stableJsonSort(value));
}

/**
 * Compute SHA-256 hex digest of a canonical JSON representation.
 */
export function sha256Hash(value: unknown): string {
  const canonical = canonicalJsonStringify(value);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Compute SHA-256 hex digest of raw string content.
 * Use only when canonical JSON is not applicable.
 */
export function sha256Raw(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
