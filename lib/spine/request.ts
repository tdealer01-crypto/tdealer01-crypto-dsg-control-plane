import type { SpineIntentPayload } from './types';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function normalizeSpinePayload(body: unknown): SpineIntentPayload {
  const source = asRecord(body);
  const nestedIntent = asRecord(source.intent);
  const envelope = Object.keys(nestedIntent).length > 0 ? nestedIntent : source;

  const agentId = String(source.agent_id || envelope.agent_id || '');
  const context = asRecord(envelope.context);
  const input = asRecord(envelope.input);
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
