/**
 * diffJson - Compare two JSON objects and return their differences
 * Shows which fields were added, removed, or changed
 */

export interface DiffResult {
  added: string[];
  removed: string[];
  changed: Array<{
    path: string;
    before: unknown;
    after: unknown;
  }>;
}

/**
 * Compare two JSON objects recursively and return differences
 * @param before - Original object
 * @param after - Updated object
 * @param prefix - Path prefix for nested keys (internal use)
 * @returns DiffResult with added/removed/changed fields
 */
export function diffJson(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  prefix = '',
): DiffResult {
  const result: DiffResult = {
    added: [],
    removed: [],
    changed: [],
  };

  if (!before && !after) return result;
  if (!before) before = {};
  if (!after) after = {};

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));

  // Find removed keys
  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      const path = prefix ? `${prefix}.${key}` : key;
      result.removed.push(path);
    }
  }

  // Find added and changed keys
  for (const key of afterKeys) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (!beforeKeys.has(key)) {
      result.added.push(path);
    } else {
      const beforeVal = before[key];
      const afterVal = after[key];

      // Deep comparison for nested objects
      if (
        typeof beforeVal === 'object' &&
        beforeVal !== null &&
        typeof afterVal === 'object' &&
        afterVal !== null &&
        !Array.isArray(beforeVal) &&
        !Array.isArray(afterVal)
      ) {
        const nestedDiff = diffJson(
          beforeVal as Record<string, unknown>,
          afterVal as Record<string, unknown>,
          path,
        );
        result.added.push(...nestedDiff.added);
        result.removed.push(...nestedDiff.removed);
        result.changed.push(...nestedDiff.changed);
      } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        // Values are different
        result.changed.push({
          path,
          before: beforeVal,
          after: afterVal,
        });
      }
    }
  }

  return result;
}

/**
 * Generate a human-readable summary of changes
 * @param diff - DiffResult from diffJson
 * @returns Summary string like "+2 agents, -1 org, 3 changed"
 */
export function generateDiffSummary(diff: DiffResult): string {
  const parts: string[] = [];

  if (diff.added.length > 0) {
    parts.push(`+${diff.added.length} ${diff.added.length === 1 ? 'added' : 'added'}`);
  }
  if (diff.removed.length > 0) {
    parts.push(`-${diff.removed.length} ${diff.removed.length === 1 ? 'removed' : 'removed'}`);
  }
  if (diff.changed.length > 0) {
    parts.push(`${diff.changed.length} changed`);
  }

  if (parts.length === 0) {
    return 'No changes';
  }

  return parts.join(', ');
}

/**
 * Count occurrences of a field name in diff results
 * Useful for summaries like "3 agents changed"
 */
export function countFieldChanges(diff: DiffResult, fieldPattern: RegExp): number {
  const count =
    diff.added.filter((p) => fieldPattern.test(p)).length +
    diff.removed.filter((p) => fieldPattern.test(p)).length +
    diff.changed.filter((c) => fieldPattern.test(c.path)).length;
  return count;
}
