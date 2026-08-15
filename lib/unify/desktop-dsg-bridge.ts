import { createHash } from 'node:crypto';
import type {
  AgentActionResultRequest,
  AgentActionResultReceipt,
  AgentCommandGateRequest,
  AgentCommandGateResult,
} from '@/lib/dsg/agent-command-gate';

export type UnifyExecutionTarget = 'desktop' | 'browser' | 'shell';

export interface UnifyFormalContext {
  is_grounded: boolean;
  is_api_clean: boolean;
  source_verified: boolean;
  has_audit_trail: boolean;
  nonce_lock: boolean;
  value: number;
  intent_score: number;
  compute_cost: number;
}

export interface UnifyExecutionRequest {
  target: UnifyExecutionTarget;
  action: string;
  args?: Record<string, unknown>;
  formalContext: UnifyFormalContext;
  gateRequest: AgentCommandGateRequest;
}

export interface UnifyExecutorResult {
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'BLOCKED_BY_TARGET';
  output: unknown;
  targetReceiptId?: string;
  errorClass?: string;
  errorMessage?: string;
}

export interface UnifyExecutor {
  execute(input: {
    target: UnifyExecutionTarget;
    action: string;
    args?: Record<string, unknown>;
    envelope: NonNullable<AgentCommandGateResult['actionEnvelope']>;
  }): Promise<UnifyExecutorResult>;
}

export interface UnifyEvidenceStore {
  save(evidence: UnifyLocalEvidence): Promise<void>;
}

export interface UnifyBridgeTransportOptions {
  baseUrl: string;
  bearerToken?: string;
  fetchImpl?: typeof fetch;
}

export interface UnifyLocalEvidence {
  schemaVersion: 'unify-dsg-evidence-v1';
  target: UnifyExecutionTarget;
  action: string;
  actionArgsHash: string;
  commandId: string;
  commandHash: string;
  gateDecision: 'PASS';
  gateDecisionHash: string;
  envelopeId: string;
  formalProofHash: string;
  formalConstraintsHash: string;
  formalStatus: 'SAT';
  executionStatus: UnifyExecutorResult['status'];
  observedResultHash: string;
  startedAt: string;
  completedAt: string;
  evidenceHash: string;
}

export interface UnifyReplayResult {
  ok: boolean;
  integrityMatch: boolean;
  formalProofMatch: boolean;
  reason: 'REPLAY_VERIFIED' | 'EVIDENCE_HASH_MISMATCH' | 'FORMAL_PROOF_MISMATCH' | 'FORMAL_REPLAY_BLOCKED';
}

export type UnifyGovernedExecutionResult =
  | {
      decision: 'BLOCK';
      stage: 'MAKK8_Z3' | 'DSG_ONE_GATE';
      executed: false;
      formal?: FormalApiResult;
      gate?: AgentCommandGateResult;
    }
  | {
      decision: 'ALLOW';
      stage: 'COMPLETE';
      executed: true;
      formal: FormalApiResult;
      gate: AgentCommandGateResult;
      execution: UnifyExecutorResult;
      receipt: AgentActionResultReceipt | null;
      evidence: UnifyLocalEvidence;
      replay: UnifyReplayResult;
    };

interface FormalApiResult {
  ok: boolean;
  decision: 'ALLOW' | 'BLOCK';
  makk8: {
    ok: boolean;
    decision: 'ALLOW' | 'BLOCK';
    status: 'SAT' | 'UNSAT' | 'UNKNOWN';
    reason: string;
    proofHash: string;
    constraintsHash: string;
  };
}

interface GateApiResponse {
  ok: boolean;
  result: AgentCommandGateResult;
}

interface ResultApiResponse {
  ok?: boolean;
  receipt?: AgentActionResultReceipt;
  result?: AgentActionResultReceipt;
}

/**
 * Unify Desktop Assistant governed execution chain:
 * Makk-8/Z3 -> DSG ONE command gate -> injected local executor -> local evidence -> replay.
 *
 * This module never executes OS/browser/shell actions by itself. Execution is only
 * performed by the caller-provided executor after both verifier stages return ALLOW/PASS.
 */
export class UnifyDesktopDsgBridge {
  private readonly baseUrl: string;
  private readonly bearerToken?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UnifyBridgeTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.bearerToken = options.bearerToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(
    request: UnifyExecutionRequest,
    executor: UnifyExecutor,
    evidenceStore?: UnifyEvidenceStore,
  ): Promise<UnifyGovernedExecutionResult> {
    const formal = await this.verifyFormal(request.formalContext);
    if (!formal.ok || formal.decision !== 'ALLOW' || formal.makk8.status !== 'SAT') {
      return { decision: 'BLOCK', stage: 'MAKK8_Z3', executed: false, formal };
    }

    const gateResponse = await this.postJson<GateApiResponse>(
      '/api/dsg/agent-command-gate',
      request.gateRequest,
      true,
    );
    const gate = gateResponse.result;
    if (!gateResponse.ok || !gate.canAgentExecute || gate.decision !== 'PASS' || !gate.actionEnvelope) {
      return { decision: 'BLOCK', stage: 'DSG_ONE_GATE', executed: false, formal, gate };
    }

    const startedAt = new Date().toISOString();
    const execution = await executor.execute({
      target: request.target,
      action: request.action,
      args: request.args,
      envelope: gate.actionEnvelope,
    });
    const completedAt = new Date().toISOString();
    const observedResultHash = sha256(execution.output);

    const evidence = buildLocalEvidence({
      request,
      formal,
      gate,
      execution,
      observedResultHash,
      startedAt,
      completedAt,
    });

    await evidenceStore?.save(evidence);

    const resultPayload: AgentActionResultRequest = {
      workspaceId: request.gateRequest.workspaceId,
      agentId: request.gateRequest.runtime.agentId,
      sessionId: request.gateRequest.runtime.sessionId,
      commandId: request.gateRequest.command.commandId,
      envelopeId: gate.actionEnvelope.envelopeId,
      decisionHash: gate.decisionHash,
      status: execution.status,
      startedAt,
      completedAt,
      observedResultHash,
      evidenceItemIds: [`unify-local:${evidence.evidenceHash}`],
      targetSystemReceiptId: execution.targetReceiptId,
      errorClass: execution.errorClass,
      errorMessage: execution.errorMessage,
      planHash: request.gateRequest.command.planHash,
      scopeHash: request.gateRequest.command.scopeHash,
    };

    let receipt: AgentActionResultReceipt | null = null;
    try {
      const resultResponse = await this.postJson<ResultApiResponse>(
        gate.actionEnvelope.mustReturnResultTo,
        resultPayload,
        true,
      );
      receipt = resultResponse.receipt ?? resultResponse.result ?? null;
    } catch {
      // Local evidence remains valid even if remote receipt delivery is temporarily unavailable.
      // The caller can retry result delivery using the same evidence hash/idempotent command context.
    }

    const replay = await this.replay(evidence, request.formalContext);

    return {
      decision: 'ALLOW',
      stage: 'COMPLETE',
      executed: true,
      formal,
      gate,
      execution,
      receipt,
      evidence,
      replay,
    };
  }

  async replay(evidence: UnifyLocalEvidence, formalContext: UnifyFormalContext): Promise<UnifyReplayResult> {
    const integrityMatch = verifyLocalEvidenceIntegrity(evidence);
    if (!integrityMatch) {
      return {
        ok: false,
        integrityMatch: false,
        formalProofMatch: false,
        reason: 'EVIDENCE_HASH_MISMATCH',
      };
    }

    const formal = await this.verifyFormal(formalContext);
    if (!formal.ok || formal.makk8.status !== 'SAT') {
      return {
        ok: false,
        integrityMatch: true,
        formalProofMatch: false,
        reason: 'FORMAL_REPLAY_BLOCKED',
      };
    }

    const formalProofMatch = formal.makk8.proofHash === evidence.formalProofHash;
    return {
      ok: formalProofMatch,
      integrityMatch: true,
      formalProofMatch,
      reason: formalProofMatch ? 'REPLAY_VERIFIED' : 'FORMAL_PROOF_MISMATCH',
    };
  }

  async verifyFormal(context: UnifyFormalContext): Promise<FormalApiResult> {
    return this.postJson<FormalApiResult>('/api/dsg/makk8-z3/verify', { context }, false);
  }

  private async postJson<T>(path: string, body: unknown, requireAuth: boolean): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.bearerToken) headers.Authorization = `Bearer ${this.bearerToken}`;
    if (requireAuth && !this.bearerToken) {
      // Browser/session deployments may authenticate through cookies, so do not block locally.
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as T;
    if (!response.ok && response.status !== 409) {
      throw new Error(`DSG bridge request failed: ${path} (${response.status})`);
    }
    return payload;
  }
}

export function verifyLocalEvidenceIntegrity(evidence: UnifyLocalEvidence): boolean {
  const { evidenceHash, ...unsigned } = evidence;
  return sha256(unsigned) === evidenceHash;
}

function buildLocalEvidence(input: {
  request: UnifyExecutionRequest;
  formal: FormalApiResult;
  gate: AgentCommandGateResult;
  execution: UnifyExecutorResult;
  observedResultHash: string;
  startedAt: string;
  completedAt: string;
}): UnifyLocalEvidence {
  if (!input.gate.actionEnvelope || input.gate.decision !== 'PASS' || input.formal.makk8.status !== 'SAT') {
    throw new Error('Cannot build ALLOW evidence without SAT formal proof and PASS action envelope');
  }

  const unsigned = {
    schemaVersion: 'unify-dsg-evidence-v1' as const,
    target: input.request.target,
    action: input.request.action,
    actionArgsHash: sha256(input.request.args ?? {}),
    commandId: input.request.gateRequest.command.commandId,
    commandHash: input.gate.commandHash,
    gateDecision: 'PASS' as const,
    gateDecisionHash: input.gate.decisionHash,
    envelopeId: input.gate.actionEnvelope.envelopeId,
    formalProofHash: input.formal.makk8.proofHash,
    formalConstraintsHash: input.formal.makk8.constraintsHash,
    formalStatus: 'SAT' as const,
    executionStatus: input.execution.status,
    observedResultHash: input.observedResultHash,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };

  return { ...unsigned, evidenceHash: sha256(unsigned) };
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
