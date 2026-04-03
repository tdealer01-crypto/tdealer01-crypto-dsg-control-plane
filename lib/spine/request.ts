import type { CanonicalInput } from '../runtime/canonical';
import type { SpineIntentPayload } from './types';

type CanonicalRecord = { [key: string]: CanonicalInput | undefined };

function isCanonicalPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toCanonicalInput(value: unknown): CanonicalInput | undefined {
  if (isCanonicalPrimitive(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const list: CanonicalInput[] = [];
    for (const item of value) {
      const converted = toCanonicalInput(item);
      if (typeof converted === 'undefined') {
        return undefined;
      }
      list.push(converted);
    }
    return list;
  }

  if (value && typeof value === 'object') {
    return toCanonicalRecord(value as Record<string, unknown>);
  }

  return undefined;
}

function toCanonicalRecord(input: Record<string, unknown>): CanonicalRecord {
  const result: CanonicalRecord = {};

  for (const [key, value] of Object.entries(input)) {
    const converted = toCanonicalInput(value);
    if (typeof converted !== 'undefined') {
      result[key] = converted;
    }
  }

  return result;
}

export function normalizeSpinePayload(body: unknown): SpineIntentPayload {
  const source = asRecord(body);
  const nestedIntent = asRecord(source.intent);
  const envelope = Object.keys(nestedIntent).length > 0 ? nestedIntent : source;

  const agentId = String(source.agent_id || envelope.agent_id || '');
  const context = toCanonicalRecord(asRecord(envelope.context));
  const input = toCanonicalRecord(asRecord(envelope.input));
  const action = String(envelope.action || context.action || 'scan');

  return {
    agentId,
    action,
    input,
    context,
    canonicalRequest: {
      action,
      input,
      context,
    },
  };
}
