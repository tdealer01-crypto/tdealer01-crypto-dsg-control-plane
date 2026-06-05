import { executeAgent } from './executor';
import type { AgentDispatchOrder, AgentResult } from './types';

export interface LoopOptions {
  maxAttempts?: number;
  goalLocked?: boolean;
  mockState?: boolean;
  gateAllow?: boolean;
  onAttempt?: (attempt: number, result: AgentResult) => void;
}

export interface LoopResult {
  ok: boolean;
  finalResult: AgentResult;
  attempts: AgentResult[];
  totalAttempts: number;
}

// Plan → Act → Observe → Repair → Verify loop for each agent.
// Stops on first PASS or after maxAttempts BLOCK/FAIL.
export async function runAgentLoop(
  dispatch: AgentDispatchOrder,
  opts: LoopOptions = {},
): Promise<LoopResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const attempts: AgentResult[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await executeAgent(dispatch, {
      goalLocked: opts.goalLocked,
      mockState: opts.mockState,
      gateAllow: opts.gateAllow,
    });

    attempts.push(result);
    opts.onAttempt?.(attempt, result);

    if (result.ok && result.status === 'pass') {
      return { ok: true, finalResult: result, attempts, totalAttempts: attempt };
    }

    // Do not retry hard blocks (Z3 invariant violation or gate denial)
    if (result.error?.startsWith('Z3_BLOCK') || result.error === 'GATE_DECISION_NOT_ALLOW') {
      return { ok: false, finalResult: result, attempts, totalAttempts: attempt };
    }
  }

  const last = attempts[attempts.length - 1];
  return { ok: false, finalResult: last, attempts, totalAttempts: maxAttempts };
}
