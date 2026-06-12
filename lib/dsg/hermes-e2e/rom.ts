import { sha256Json } from './hash';
import type { HermesRomContext } from './types';

export function buildDryRunHermesRomContext(input: {
  goal: string;
  policyHints?: string[];
}): HermesRomContext {
  const contextText = [
    `goal:${input.goal}`,
    ...(input.policyHints ?? []),
    'memory_boundary: memory_is_context_not_evidence',
  ].join('\n');

  return {
    mode: 'READ_ONLY_OPERATIONAL_MEMORY',
    status: 'PASS',
    contextText,
    contextHash: sha256Json({ contextText }),
    reasons: ['DRY_RUN_ROM_CONTEXT'],
    rule: 'ROM_CONTEXT_CANNOT_OVERRIDE_EVIDENCE_OR_RUNTIME_TRUTH',
  };
}
