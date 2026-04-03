import { describe, expect, it } from 'vitest';

import { buildMakk8ActionData } from '../../../lib/makk8/action-data';

describe('buildMakk8ActionData', () => {
  it('normalizes values from input/context with defaults', () => {
    const actionData = buildMakk8ActionData(
      { value: '150', compute_cost: '42', nonce_lock: 'true' },
      { intent_score: '3', source_verified: false }
    );

    expect(actionData.value).toBe(150);
    expect(actionData.compute_cost).toBe(42);
    expect(actionData.intent_score).toBe(3);
    expect(actionData.source_verified).toBe(false);
    expect(actionData.nonce_lock).toBe(true);
    expect(actionData.has_audit_trail).toBe(true);
  });

  it('uses safe defaults when values are missing or invalid', () => {
    const actionData = buildMakk8ActionData(
      { value: 'not-a-number' },
      { is_grounded: 'false', intent_score: null, is_api_clean: undefined }
    );

    expect(actionData.value).toBe(0);
    expect(actionData.is_grounded).toBe(false);
    expect(actionData.intent_score).toBe(1);
    expect(actionData.is_api_clean).toBe(true);
    expect(actionData.source_verified).toBe(true);
    expect(actionData.nonce_lock).toBe(true);
  });
});
