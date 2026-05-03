export function stableAppBuilderJson(value: unknown): string {
  return JSON.stringify(normalizeAppBuilderValue(value));
}

function normalizeAppBuilderValue(value: unknown): unknown {
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map((item) => normalizeAppBuilderValue(item));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(input).sort()) {
      output[key] = normalizeAppBuilderValue(input[key]);
    }

    return output;
  }

  return value;
}
