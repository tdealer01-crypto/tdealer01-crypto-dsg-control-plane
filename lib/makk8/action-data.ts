function toNumber(value: unknown, fallback: number): number {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export function buildMakk8ActionData(
  input: Record<string, unknown> = {},
  context: Record<string, unknown> = {}
) {
  return {
    value: toNumber(input.value, 0),
    compute_cost: toNumber(input.compute_cost, 0),
    intent_score: toNumber(context.intent_score, 1),
    source_verified: toBoolean(context.source_verified, true),
    nonce_lock: toBoolean(input.nonce_lock, true),
    has_audit_trail: true,
    is_grounded: toBoolean(context.is_grounded, true),
    is_api_clean: toBoolean(context.is_api_clean, true),
  };
}
