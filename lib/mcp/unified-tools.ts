import { createHmac, timingSafeEqual } from 'node:crypto';
import { Octokit } from '@octokit/rest';
import { callDsgTool } from './dsg-tools';

export const UNIFIED_TOOL_SCHEMAS = {
  'dsg.system.status': {
    description: 'Return the unified DSG Control Plane MCP adapter status without exposing secrets.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  'dsg.aimo.status': {
    description: 'Check the DSG ONE AIMO harness surface through the unified control-plane gateway.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  'dsg.aimo.solve': {
    description: 'Run the governed AIMO pipeline through DSG ONE -> DSG AGI Simulation -> Cinema Proof Agent.',
    inputSchema: {
      type: 'object',
      properties: {
        problem: {
          type: 'object',
          properties: {
            problemId: { type: 'string' },
            statement: { type: 'string' },
            domain: { type: 'string' },
            constraints: { type: 'object', additionalProperties: true },
          },
          required: ['statement'],
          additionalProperties: true,
        },
        shardCount: { type: 'integer', minimum: 1, maximum: 4096 },
        parallelism: { type: 'integer', minimum: 1, maximum: 64 },
        maxCandidatesPerShard: { type: 'integer', minimum: 1, maximum: 64 },
        requireAllShards: { type: 'boolean' },
        nvidiaIsing: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['off', 'live', 'pinned'] },
            pinnedText: { type: 'string' },
            model: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['problem'],
      additionalProperties: false,
    },
  },
  'dsg.aws.contract': {
    description: 'Return the governed AWS execution contract used by the Control Plane and AWS Agent Toolkit adapter.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  'dsg.aws.deploy': {
    description: 'Gate and dispatch the repository CDK deployment workflow. Deployment remains REVIEW until post-deploy evidence verifies it.',
    inputSchema: {
      type: 'object',
      properties: {
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        approved: { type: 'boolean', description: 'Explicit operator approval to dispatch the governed workflow.' },
      },
      required: ['environment', 'approved'],
      additionalProperties: false,
    },
  },
} as const;

export type UnifiedToolName = keyof typeof UNIFIED_TOOL_SCHEMAS;
export const UNIFIED_TOOL_NAMES = Object.keys(UNIFIED_TOOL_SCHEMAS) as UnifiedToolName[];

export type UnifiedToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

function secretEquals(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function isUnifiedMcpKeyAuthorized(request: Request): boolean {
  const expected = process.env.DSG_MCP_API_KEY ?? process.env.DSG_API_KEY;
  if (!expected) return false;

  const bearer = request.headers.get('authorization');
  const bearerValue = bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null;
  const provided =
    request.headers.get('x-dsg-api-key') ??
    request.headers.get('x-api-key') ??
    bearerValue;

  return Boolean(provided && secretEquals(provided, expected));
}

function dsgOneBaseUrl(): URL {
  const raw = process.env.DSG_ONE_MCP_BACKEND_URL ?? 'https://dsg-one-v1.vercel.app';
  const url = new URL(raw);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('DSG_ONE_MCP_BACKEND_URL must use HTTPS in production');
  }
  return url;
}

function aimoRootKey(): string | null {
  return (
    process.env.DSG_AIMO_ROOT_KEY?.trim() ||
    process.env.DSG_MCP_ROOT_KEY?.trim() ||
    null
  );
}

function controlPlaneInternalToken(): string | null {
  const root = aimoRootKey();
  if (!root) return null;
  const digest = createHmac('sha256', root)
    .update('dsg-aimo-v1:control-plane')
    .digest('hex');
  return `dsg_aimo_${digest}`;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 2000) };
  }
}

async function handleAimoStatus(): Promise<UnifiedToolResult> {
  const url = new URL('/api/dsg/aimo/solve', dsgOneBaseUrl());
  try {
    const token = controlPlaneInternalToken();
    const response = await fetch(url, {
      headers: token ? { 'X-DSG-Internal-Key': token } : {},
      signal: AbortSignal.timeout(15_000),
    });
    const body = await parseJson(response);
    return {
      ok: true,
      result: {
        verdict: response.ok ? 'PASS' : 'REVIEW',
        httpStatus: response.status,
        backend: 'dsg-one-v1',
        body,
        rootKeyConfigured: Boolean(aimoRootKey()),
      },
    };
  } catch (error) {
    return {
      ok: true,
      result: {
        verdict: 'REVIEW',
        backend: 'dsg-one-v1',
        rootKeyConfigured: Boolean(aimoRootKey()),
        reason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function handleAimoSolve(args: Record<string, unknown>): Promise<UnifiedToolResult> {
  const internalToken = controlPlaneInternalToken();
  if (!internalToken) {
    return {
      ok: false,
      code: -32010,
      message: 'DSG_AIMO_ROOT_KEY is not configured on the Control Plane. Competition compute fails closed.',
    };
  }

  const problem = args.problem;
  if (!problem || typeof problem !== 'object' || typeof (problem as Record<string, unknown>).statement !== 'string') {
    return { ok: false, code: -32602, message: 'problem.statement is required' };
  }

  const url = new URL('/api/dsg/aimo/solve', dsgOneBaseUrl());
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-DSG-Internal-Key': internalToken,
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(180_000),
    });
    const body = await parseJson(response);
    if (!response.ok) {
      return {
        ok: false,
        code: -32020,
        message: `DSG ONE AIMO backend returned HTTP ${response.status}: ${JSON.stringify(body)}`,
      };
    }
    return { ok: true, result: body };
  } catch (error) {
    return {
      ok: false,
      code: -32021,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function handleSystemStatus(): UnifiedToolResult {
  return {
    ok: true,
    result: {
      ok: true,
      gateway: 'DSG Control Plane Unified MCP',
      version: '1.0.0',
      oneFrontDoor: true,
      adapters: {
        controlPlane: { configured: true, authoritativeGate: true },
        dsgOne: { configured: true, defaultUrlAvailable: true },
        aimoInternalRootKey: { configured: Boolean(aimoRootKey()) },
        awsWorkflowDispatch: {
          configured: Boolean(process.env.DSG_GITHUB_AUTOMATION_TOKEN ?? process.env.GITHUB_TOKEN),
          workflow: '.github/workflows/cdk-deploy.yml',
        },
      },
      userConfiguration: ['DSG_MCP_URL', 'DSG_API_KEY'],
      truthBoundary:
        'Adapter availability is not production readiness. PASS requires downstream evidence and verification; missing internal credentials fail closed.',
    },
  };
}

function handleAwsContract(): UnifiedToolResult {
  return {
    ok: true,
    result: {
      adapter: 'AWS Agent Toolkit / governed GitHub OIDC CDK workflow',
      contract: ['Plan', 'Gate', 'AWS execution', 'Evidence', 'Verification'],
      workflow: '.github/workflows/cdk-deploy.yml',
      destructiveRollbackAutomatic: false,
      productionApprovalRequired: true,
      finalPassRule:
        'A workflow dispatch is REVIEW, never PASS. PASS requires accepted CloudFormation state plus captured AWS verification evidence.',
      currentInfrastructureBoundary:
        'The current AWS construct proves an ECS cluster only; it does not prove a Fargate application service exists.',
    },
  };
}

async function handleAwsDeploy(args: Record<string, unknown>): Promise<UnifiedToolResult> {
  const environment = String(args.environment ?? '');
  if (!['dev', 'staging', 'prod'].includes(environment)) {
    return { ok: false, code: -32602, message: 'environment must be dev, staging, or prod' };
  }

  const gate = await callDsgTool('dsg.evaluate', {
    action: `deploy.aws.${environment}`,
    actor: 'mcp:unified-control-plane',
    tool: 'github-actions:cdk-deploy',
    args: { environment },
    env: {
      riskLevel: environment === 'prod' ? 'critical' : 'high',
      policyRef: 'dsg-aws-agent-toolkit-v1',
    },
  });

  if (!gate.ok) return gate;
  const decision = gate.result as Record<string, unknown>;
  if (decision.gateStatus !== 'PASS') {
    return {
      ok: true,
      result: {
        verdict: decision.gateStatus ?? 'BLOCK',
        dispatched: false,
        gate: decision,
        nextAction: 'Resolve the deterministic DSG gate before any AWS mutation.',
      },
    };
  }

  if (args.approved !== true) {
    return {
      ok: true,
      result: {
        verdict: 'REVIEW',
        dispatched: false,
        gate: decision,
        nextAction: 'Set approved=true only after the operator approves this exact deployment plan.',
      },
    };
  }

  const token = process.env.DSG_GITHUB_AUTOMATION_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      ok: false,
      code: -32030,
      message: 'Server-side GitHub workflow credential is not configured. AWS deployment remains BLOCKED.',
    };
  }

  const repository = process.env.DSG_CONTROL_PLANE_REPOSITORY ?? 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    return { ok: false, code: -32031, message: 'DSG_CONTROL_PLANE_REPOSITORY must be owner/repo' };
  }

  const octokit = new Octokit({ auth: token });
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: 'cdk-deploy.yml',
    ref: process.env.DSG_AWS_DEPLOY_REF ?? 'main',
    inputs: {
      environment,
      approval_required: 'true',
    },
  });

  return {
    ok: true,
    result: {
      verdict: 'REVIEW',
      dispatched: true,
      environment,
      gate: decision,
      workflow: 'cdk-deploy.yml',
      nextAction:
        'Wait for protected-environment approval and post-deploy verification evidence. Do not claim production readiness from dispatch success.',
    },
  };
}

export async function callUnifiedTool(
  name: UnifiedToolName,
  args: Record<string, unknown>,
): Promise<UnifiedToolResult> {
  try {
    switch (name) {
      case 'dsg.system.status':
        return handleSystemStatus();
      case 'dsg.aimo.status':
        return await handleAimoStatus();
      case 'dsg.aimo.solve':
        return await handleAimoSolve(args);
      case 'dsg.aws.contract':
        return handleAwsContract();
      case 'dsg.aws.deploy':
        return await handleAwsDeploy(args);
      default:
        return { ok: false, code: -32601, message: `Unknown unified tool: ${String(name)}` };
    }
  } catch (error) {
    return {
      ok: false,
      code: -32603,
      message: error instanceof Error ? error.message : 'Unified MCP tool error',
    };
  }
}
