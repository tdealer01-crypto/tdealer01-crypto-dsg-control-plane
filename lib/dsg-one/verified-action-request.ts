import type { VerifiedActionSurface } from './verified-action-receipt';

/**
 * Request contract for POST /api/dsg/v1/actions/verify.
 *
 * The caller's runtime performs the action. DSG receives what the runtime
 * observed and verifies it against the canonical chain, so this payload always
 * carries an already-produced simulation witness and execution result. A caller
 * that omits them is asking DSG to execute, which this product does not do.
 */

export interface VerifiedActionSimulationInput {
  ok: boolean;
  witnessHash: string;
  reason?: string;
}

export interface VerifiedActionExecutionInput {
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  observations: Record<string, unknown>;
  evidence: Array<{
    fact: string;
    observerRole: 'verifier';
    hash: string;
    [key: string]: unknown;
  }>;
  observedResultHash: string;
  evidenceItemIds: string[];
}

export interface VerifiedActionRequest {
  idempotencyKey: string;
  surface: VerifiedActionSurface;
  sessionId: string;
  agentId?: string;
  agentName?: string;
  planContractVerified?: boolean;
  optimization: Record<string, unknown>;
  actionSolution: {
    database?: 'supabase';
    runtime?: 'render' | 'netlify';
    environment: string;
    commitSha: string;
  };
  approval?: {
    requestId?: string;
    decision?: 'approved' | 'rejected' | 'pending';
    approvedBy?: string;
    approvedAt?: string;
  };
  audit?: {
    preAuditEventId?: string;
    ledgerId?: string;
    chainHeadHash?: string;
  };
  evidence?: {
    evidenceManifestId?: string;
    policySnapshotHash?: string;
    runtimeBindingHash?: string;
  };
  observed: {
    simulation: VerifiedActionSimulationInput;
    execution: VerifiedActionExecutionInput;
  };
}

export interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * Flat rather than a discriminated union: this project compiles with
 * `strict: false`, so narrowing on a boolean literal discriminant does not
 * apply. `details` is always an array and is empty when `ok` is true.
 */
export interface VerifiedActionValidation {
  ok: boolean;
  value?: VerifiedActionRequest;
  details: ValidationDetail[];
}

const SURFACES: readonly VerifiedActionSurface[] = ['api', 'unify', 'trinity-mcp'];
const EXECUTION_STATUSES = ['SUCCESS', 'FAILED', 'PARTIAL'] as const;
const HEX_64 = /^[0-9a-f]{64}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateVerifiedActionRequest(input: unknown): VerifiedActionValidation {
  const details: ValidationDetail[] = [];
  const body = record(input);
  if (!body) {
    return { ok: false, details: [{ field: 'body', message: 'must be a JSON object' }] };
  }

  if (!nonEmptyString(body.idempotencyKey)) {
    details.push({ field: 'idempotencyKey', message: 'required' });
  }
  if (!nonEmptyString(body.sessionId)) {
    details.push({ field: 'sessionId', message: 'required' });
  }

  const surface = body.surface ?? 'api';
  if (!SURFACES.includes(surface as VerifiedActionSurface)) {
    details.push({ field: 'surface', message: `must be one of ${SURFACES.join(', ')}` });
  }

  const optimization = record(body.optimization);
  if (!optimization) {
    details.push({ field: 'optimization', message: 'required' });
  } else {
    if (!nonEmptyString(optimization.problemId)) {
      details.push({ field: 'optimization.problemId', message: 'required' });
    }
    if (!Array.isArray(optimization.tasks) || optimization.tasks.length === 0) {
      details.push({ field: 'optimization.tasks', message: 'must be a non-empty array' });
    }
    if (!Array.isArray(optimization.agentCapacities) || optimization.agentCapacities.length === 0) {
      details.push({ field: 'optimization.agentCapacities', message: 'must be a non-empty array' });
    }
    // The canonical chain only compiles an Action IR from VERIFIED_GLOBAL_OPTIMUM,
    // which the pipeline only emits for an explicitly bound business objective.
    // Rejecting here gives a precise 400 instead of a confusing downstream BLOCK.
    const objective = record(optimization.objective);
    if (!objective) {
      details.push({
        field: 'optimization.objective',
        message: 'required — global optimality is never claimed for an unbound objective',
      });
    } else {
      if (!nonEmptyString(objective.version)) {
        details.push({ field: 'optimization.objective.version', message: 'required' });
      }
      if (!record(objective.assignmentCosts)) {
        details.push({ field: 'optimization.objective.assignmentCosts', message: 'required' });
      }
    }
  }

  const actionSolution = record(body.actionSolution);
  if (!actionSolution) {
    details.push({ field: 'actionSolution', message: 'required' });
  } else {
    if (!nonEmptyString(actionSolution.environment)) {
      details.push({ field: 'actionSolution.environment', message: 'required' });
    }
    if (!nonEmptyString(actionSolution.commitSha)) {
      details.push({ field: 'actionSolution.commitSha', message: 'required' });
    }
  }

  const observed = record(body.observed);
  if (!observed) {
    details.push({
      field: 'observed',
      message: 'required — DSG verifies an executed action, it does not execute one',
    });
  } else {
    const simulation = record(observed.simulation);
    if (!simulation) {
      details.push({ field: 'observed.simulation', message: 'required' });
    } else {
      if (typeof simulation.ok !== 'boolean') {
        details.push({ field: 'observed.simulation.ok', message: 'must be a boolean' });
      }
      if (typeof simulation.witnessHash !== 'string' || !HEX_64.test(simulation.witnessHash)) {
        details.push({
          field: 'observed.simulation.witnessHash',
          message: 'must be a 64-character lowercase hex sha256',
        });
      }
    }

    const execution = record(observed.execution);
    if (!execution) {
      details.push({ field: 'observed.execution', message: 'required' });
    } else {
      if (!EXECUTION_STATUSES.includes(execution.status as (typeof EXECUTION_STATUSES)[number])) {
        details.push({
          field: 'observed.execution.status',
          message: `must be one of ${EXECUTION_STATUSES.join(', ')}`,
        });
      }
      if (!record(execution.observations)) {
        details.push({ field: 'observed.execution.observations', message: 'required' });
      }
      if (!Array.isArray(execution.evidence) || execution.evidence.length === 0) {
        details.push({
          field: 'observed.execution.evidence',
          message: 'must be a non-empty array — no evidence means no receipt',
        });
      }
      if (
        typeof execution.observedResultHash !== 'string' ||
        !HEX_64.test(execution.observedResultHash)
      ) {
        details.push({
          field: 'observed.execution.observedResultHash',
          message: 'must be a 64-character lowercase hex sha256',
        });
      }
      if (!Array.isArray(execution.evidenceItemIds) || execution.evidenceItemIds.length === 0) {
        details.push({ field: 'observed.execution.evidenceItemIds', message: 'must be a non-empty array' });
      }
    }
  }

  if (details.length > 0) return { ok: false, details };

  return {
    ok: true,
    details,
    value: {
      ...(body as unknown as VerifiedActionRequest),
      surface: surface as VerifiedActionSurface,
    },
  };
}
