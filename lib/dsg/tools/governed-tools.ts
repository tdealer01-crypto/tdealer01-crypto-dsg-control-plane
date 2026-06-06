/**
 * Governed tool request preparation.
 *
 * A deterministic pre-execution gate for tool/skill actions. It does not
 * execute anything itself; it validates the request shape, requires evidence
 * for write-class actions, and returns a gate decision plus a content-addressed
 * audit id. Callers run the action only when `ok` is true and `status` is
 * `ready`.
 *
 * Boundary: this is a static governance scaffold. A `ready` decision means the
 * request satisfied the deterministic checks here — it is not proof that the
 * downstream tool executed or succeeded.
 */

import { sha256Json } from '@/lib/dsg/runtime/hash';

export type GovernedToolKind = 'api' | 'browser' | 'filesystem' | 'shell' | 'mcp';

export type GovernedToolAction = 'query' | 'create' | 'update' | 'delete' | 'execute';

export type GovernedToolRequest = {
  tool: GovernedToolKind;
  action: GovernedToolAction;
  goal: string;
  args?: Record<string, unknown>;
  evidence?: string[];
};

export type GovernedToolGateStatus = 'ready' | 'review' | 'blocked';

export type GovernedToolAudit = {
  id: string;
  tool: GovernedToolKind;
  action: GovernedToolAction;
  decidedAt: string;
};

export type GovernedToolDecision = {
  ok: boolean;
  status: GovernedToolGateStatus;
  blockedReasons: string[];
  reviewReasons: string[];
  requestHash: string;
  audit: GovernedToolAudit;
};

/** Write-class actions mutate external state and require evidence to proceed. */
const WRITE_ACTIONS: GovernedToolAction[] = ['create', 'update', 'delete', 'execute'];

/**
 * Evaluate a governed tool request and return a deterministic gate decision.
 *
 * Rules:
 *  - A goal is always required.
 *  - Write-class actions must carry at least one evidence item, otherwise they
 *    are blocked. Read-class actions without evidence drop to review, not pass.
 *  - The audit id is derived from a canonical hash of the request so equal
 *    requests produce equal audit ids.
 */
export function prepareGovernedToolRequest(request: GovernedToolRequest): GovernedToolDecision {
  const blockedReasons: string[] = [];
  const reviewReasons: string[] = [];

  const goal = request.goal?.trim() ?? '';
  if (!goal) {
    blockedReasons.push('GOAL_REQUIRED');
  }

  const evidence = (request.evidence ?? []).filter((item) => typeof item === 'string' && item.trim().length > 0);
  const isWrite = WRITE_ACTIONS.includes(request.action);

  if (isWrite && evidence.length === 0) {
    blockedReasons.push('EVIDENCE_REQUIRED_FOR_WRITE_ACTION');
  } else if (!isWrite && evidence.length === 0) {
    reviewReasons.push('NO_EVIDENCE_PROVIDED_FOR_READ_ACTION');
  }

  const requestHash = sha256Json({
    tool: request.tool,
    action: request.action,
    goal,
    args: request.args ?? {},
    evidence,
  });

  let status: GovernedToolGateStatus;
  if (blockedReasons.length > 0) {
    status = 'blocked';
  } else if (reviewReasons.length > 0) {
    status = 'review';
  } else {
    status = 'ready';
  }

  return {
    ok: status === 'ready',
    status,
    blockedReasons,
    reviewReasons,
    requestHash,
    audit: {
      id: `gov:${request.tool}:${request.action}:${requestHash.slice(0, 16)}`,
      tool: request.tool,
      action: request.action,
      decidedAt: new Date().toISOString(),
    },
  };
}
