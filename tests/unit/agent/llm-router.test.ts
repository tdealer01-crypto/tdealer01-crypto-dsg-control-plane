import { describe, expect, it } from 'vitest';
import { addMemory, getMemory } from '../../../lib/agent/llm-router';

describe('llm-router memory cleanup', () => {
  it('cleans stale sessions even when active session exceeds MAX_MEMORY', () => {
    const base = Date.now();
    const staleSession = `stale-${base}`;
    const activeSession = `active-${base}`;

    addMemory(staleSession, {
      role: 'user',
      content: 'old',
      timestamp: base - (31 * 60 * 1000),
    });

    for (let i = 0; i < 51; i += 1) {
      addMemory(activeSession, {
        role: 'user',
        content: `msg-${i}`,
        timestamp: base + i,
      });
    }

    expect(getMemory(staleSession)).toHaveLength(0);
    expect(getMemory(activeSession)).toHaveLength(50);
  });
});
