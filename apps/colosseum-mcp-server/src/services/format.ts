import { CHARACTER_LIMIT } from "../constants.js";

/** Renders an error into a clear, actionable message for the calling agent. */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: Unexpected error occurred: ${String(error)}`;
}

/**
 * Serializes a JSON-serializable payload, truncating the top-level array
 * field named by `arrayField` (if the serialized text exceeds
 * CHARACTER_LIMIT) so responses stay within a safe context budget.
 */
export function truncatingJson<T extends Record<string, unknown>>(
  payload: T,
  arrayField: keyof T
): string {
  let text = JSON.stringify(payload, null, 2);
  if (text.length <= CHARACTER_LIMIT) {
    return text;
  }

  const items = payload[arrayField];
  if (!Array.isArray(items)) {
    return text;
  }

  const half = Math.max(1, Math.floor(items.length / 2));
  const truncated = {
    ...payload,
    [arrayField]: items.slice(0, half),
    truncated: true,
    truncation_message: `Response truncated from ${items.length} to ${half} items. Add a more specific filter to narrow results.`,
  };
  text = JSON.stringify(truncated, null, 2);
  return text;
}
