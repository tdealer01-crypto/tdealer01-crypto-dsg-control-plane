import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentExecuteBody, AgentStep } from '../../../lib/agent-governance/types';

// --- DB mock ---
const insertMock = vi.fn().mockResolvedValue({ error: null });
const requestMaybeSingle = vi.fn();
const stepsOrderMock = vi.fn();
const approvalsEqMock = vi.fn();

function makeDbMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'agent_execution_requests') {
        return {
          insert: insertMock,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: requestMaybeSingle })),
          })),
        };
      }
      if (table === 'agent_execution_steps') {
        return {
          insert: insertMock,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: stepsOrderMock })),
          })),
        };
      }
      if (table === 'agent_execution_approvals') {
        return {
          select: vi.fn(() => ({ eq: approvalsEqMock })),
        };
      }
      return { insert: insertMock };
    }),
  };
}

vi.mock('../../../lib/agent-governance/db', () => ({
  getAdminDb: vi.fn(),
}));

vi.mock('../../../lib/agent-governance/planner', () => ({
  planMessage: vi.fn(),
}));

vi.mock('../../../lib/agent-governance/policy', () => ({
  resolvePolicyDecision: vi.fn((step: AgentStep) => step.policy_mode),
}));

import { getAdminDb } from '../../../lib/agent-governance/db';
import { planMessage } from '../../../lib/agent-governance/planner';

function makeStep(overrides: Partial<AgentStep> = {}): AgentStep {
  return {
    step_index: 0,
    tool: 'readiness',
    params: {},
    policy_mode: 'allow',
    status: 'pending',
    ...overrides,
  };
}

const EXEC_ARGS = {
  origin: 'http://localhost:3000',
  internalAuthToken: 'tok',
  executionId: 'exec-1',
  workspaceId: 'ws-1',
  orgId: 'org-1',
  agentId: 'agent-1',
};

describe('planExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminDb).mockReturnValue(makeDbMock() as any);
  });

  it('delegates to planMessage and returns the result', async () => {
    const steps = [makeStep()];
    vi.mocked(planMessage).mockReturnValue(steps);

    const { planExecution } = await import('../../../lib/agent-governance/service');
    const result = await planExecution('check system health');

    expect(planMessage).toHaveBeenCalledWith('check system health');
    expect(result).toEqual(steps);
  });
});

describe('createExecutionRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
    vi.mocked(getAdminDb).mockReturnValue(makeDbMock() as any);
  });

  it('inserts a pending execution request and returns an id', async () => {
    vi.mocked(planMessage).mockReturnValue([]);

    const body: AgentExecuteBody = {
      workspace_id: 'ws-1',
      org_id: 'org-1',
      provider: 'openai',
      agent_id: 'agent-1',
      message: 'hello',
    };

    const { createExecutionRequest } = await import('../../../lib/agent-governance/service');
    const result = await createExecutionRequest(body);

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'ws-1',
        org_id: 'org-1',
        provider: 'openai',
        agent_id: 'agent-1',
        status: 'pending',
      }),
    );
  });

  it('uses the explicit plan when provided instead of planMessage', async () => {
    const explicitSteps = [makeStep({ step_index: 0, tool: 'usage' })];
    const body: AgentExecuteBody = {
      workspace_id: 'ws-1',
      org_id: 'org-1',
      provider: 'openai',
      agent_id: 'agent-1',
      plan: explicitSteps,
    };

    const { createExecutionRequest } = await import('../../../lib/agent-governance/service');
    await createExecutionRequest(body);

    expect(planMessage).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledTimes(2); // request + steps
  });

  it('skips the step insert when plan is empty', async () => {
    vi.mocked(planMessage).mockReturnValue([]);

    const body: AgentExecuteBody = {
      workspace_id: 'ws-1',
      org_id: 'org-1',
      provider: 'openai',
      agent_id: 'agent-1',
    };

    const { createExecutionRequest } = await import('../../../lib/agent-governance/service');
    await createExecutionRequest(body);

    // Only the request insert, not the steps insert
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('returns the steps resolved from planMessage', async () => {
    const steps = [makeStep({ step_index: 0 }), makeStep({ step_index: 1, tool: 'capacity' })];
    vi.mocked(planMessage).mockReturnValue(steps);

    const body: AgentExecuteBody = {
      workspace_id: 'ws-1',
      org_id: 'org-1',
      provider: 'openai',
      agent_id: 'agent-1',
      message: 'two steps',
    };

    const { createExecutionRequest } = await import('../../../lib/agent-governance/service');
    const result = await createExecutionRequest(body);

    expect(result.steps).toEqual(steps);
  });
});

describe('runStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminDb).mockReturnValue(makeDbMock() as any);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls /api/core/monitor for the readiness tool', async () => {
    const { runStep } = await import('../../../lib/agent-governance/service');
    const result = await runStep({ ...EXEC_ARGS, step: makeStep({ tool: 'readiness' }) });

    expect(vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      'http://localhost:3000/api/core/monitor',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.ok).toBe(true);
  });

  it('calls /api/usage for the usage tool', async () => {
    const { runStep } = await import('../../../lib/agent-governance/service');
    await runStep({ ...EXEC_ARGS, step: makeStep({ tool: 'usage' }) });

    expect(vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      'http://localhost:3000/api/usage',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns ok:false for unsupported tool without calling fetch', async () => {
    const { runStep } = await import('../../../lib/agent-governance/service');
    const result = await runStep({
      ...EXEC_ARGS,
      step: makeStep({ tool: 'non_existent' as any }),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsupported_tool');
    expect(vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('sends internal auth headers on every request', async () => {
    const { runStep } = await import('../../../lib/agent-governance/service');
    await runStep({ ...EXEC_ARGS, step: makeStep({ tool: 'capacity' }) });

    const callArgs = vi.mocked(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = callArgs?.[1] as RequestInit & { headers: Record<string, string> };
    expect(options.headers['x-org-id']).toBe('org-1');
    expect(options.headers['x-agent-id']).toBe('agent-1');
    expect(options.headers.authorization).toBe('Bearer tok');
  });
});

describe('getExecutionProof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminDb).mockReturnValue(makeDbMock() as any);
  });

  it('returns null when the execution request is not found', async () => {
    requestMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { getExecutionProof } = await import('../../../lib/agent-governance/service');
    const result = await getExecutionProof('missing-exec');

    expect(result).toBeNull();
  });

  it('returns a proof object with correct shape when found', async () => {
    requestMaybeSingle.mockResolvedValue({
      data: {
        id: 'exec-1',
        workspace_id: 'ws-1',
        org_id: 'org-1',
        provider: 'openai',
        agent_id: 'agent-1',
        status: 'completed',
      },
      error: null,
    });
    stepsOrderMock.mockResolvedValue({
      data: [
        { id: 'step-1', step_index: 0, tool: 'readiness', policy_mode: 'allow', status: 'completed', result: { ok: true }, error: null },
      ],
    });
    approvalsEqMock.mockResolvedValue({ data: [], error: null });

    const { getExecutionProof } = await import('../../../lib/agent-governance/service');
    const proof = await getExecutionProof('exec-1');

    expect(proof).not.toBeNull();
    expect(proof!.execution_id).toBe('exec-1');
    expect(proof!.status).toBe('completed');
    expect(proof!.steps).toHaveLength(1);
    expect(proof!.steps[0].tool).toBe('readiness');
    expect(proof!.audit_refs).toContain('agent_execution_events:exec-1');
  });

  it('maps approval status onto the matching step', async () => {
    requestMaybeSingle.mockResolvedValue({
      data: { id: 'exec-2', workspace_id: 'ws-1', org_id: 'org-1', provider: 'openai', agent_id: 'agent-1', status: 'pending' },
      error: null,
    });
    stepsOrderMock.mockResolvedValue({
      data: [
        { id: 'step-2', step_index: 0, tool: 'checkpoint', policy_mode: 'review_required', status: 'review_required', result: null, error: null },
      ],
    });
    approvalsEqMock.mockResolvedValue({
      data: [{ step_id: 'step-2', status: 'approved' }],
      error: null,
    });

    const { getExecutionProof } = await import('../../../lib/agent-governance/service');
    const proof = await getExecutionProof('exec-2');

    expect(proof!.steps[0].approval_status).toBe('approved');
  });
});
