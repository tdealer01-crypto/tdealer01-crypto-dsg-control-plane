import { createHmac } from 'node:crypto';
import { Octokit } from '@octokit/rest';
import { callDsgTool } from './dsg-tools';
import type { UnifiedAuthContext } from './unified-auth';

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
    description: 'Gate and idempotently dispatch the repository CDK deployment workflow. Deployment remains REVIEW until post-deploy evidence verifies it.',
    inputSchema: {
      type: 'object',
      properties: {
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        approved: { type: 'boolean', description: 'Explicit operator approval to dispatch the governed workflow.' },
        idempotencyKey: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          description: 'Stable request identifier reused on retries of the same intended deployment.',
        },
      },
      required: ['environment', 'approved', 'idempotencyKey'],
      additionalProperties: false,
    },
  },
} as const;

export type UnifiedToolName = keyof typeof UNIFIED_TOOL_SCHEMAS;
export const UNIFIED_TOOL_NAMES = Object.keys(UNIFIED_TOOL_SCHEMAS) as UnifiedToolName[];

export type UnifiedToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

type AwsGateEvidence = {
  secret_bound: boolean;
  dependency_resolved: boolean;
  testable: boolean;
  deploy_target_ready: boolean;
  audit_hook_available: boolean;
  environmentConfigured: boolean;
  missingRepositorySecrets: string[];
  workflowRef: string;
};

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

function hasMutationRole(auth: UnifiedAuthContext): boolean {
  return auth.roles.includes('operator') || auth.roles.includes('org_admin');
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

function handleSystemStatus(auth: UnifiedAuthContext): UnifiedToolResult {
  return {
    ok: true,
    result: {
      ok: true,
      gateway: 'DSG Control Plane Unified MCP',
      version: '1.0.0',
      oneFrontDoor: true,
      authenticatedBy: auth.source,
      adapters: {
        controlPlane: { configured: true, authoritativeGate: true },
        dsgOne: { configured: true, defaultUrlAvailable: true },
        aimoInternalRootKey: { configured: Boolean(aimoRootKey()) },
        awsWorkflowDispatch: {
          configured: Boolean(process.env.DSG_GITHUB_AUTOMATION_TOKEN ?? process.env.GITHUB_TOKEN),
          workflow: '.github/workflows/cdk-deploy.yml',
        },
      },
      userConfiguration: ['MCP URL', 'one issued DSG API key'],
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
      idempotencyRequired: true,
      finalPassRule:
        'A workflow dispatch is REVIEW, never PASS. PASS requires accepted CloudFormation state plus captured AWS verification evidence.',
      currentInfrastructureBoundary:
        'The current AWS construct proves an ECS cluster only; it does not prove a Fargate application service exists.',
    },
  };
}

function decodeGitHubContent(content: string | undefined, encoding: string | undefined): string {
  if (!content) return '';
  return encoding === 'base64'
    ? Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8')
    : content;
}

async function inspectAwsDeployEvidence(
  octokit: Octokit,
  owner: string,
  repo: string,
  environment: string,
  ref: string,
): Promise<AwsGateEvidence> {
  let workflow = '';
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/workflows/cdk-deploy.yml',
      ref,
    });
    if (!Array.isArray(response.data) && 'content' in response.data) {
      workflow = decodeGitHubContent(response.data.content, response.data.encoding);
    }
  } catch {
    workflow = '';
  }

  const requiredSecrets = ['AWS_ROLE_TO_ASSUME', 'AWS_REGION', 'AWS_ACCOUNT_ID'];
  const secretNames = new Set<string>();
  try {
    const response = await octokit.rest.actions.listRepoSecrets({ owner, repo, per_page: 100 });
    for (const secret of response.data.secrets) secretNames.add(secret.name);
  } catch {
    // Lack of permission to verify secret bindings is a fail-closed condition.
  }
  const missingRepositorySecrets = requiredSecrets.filter((name) => !secretNames.has(name));

  let environmentConfigured = false;
  try {
    await octokit.request('GET /repos/{owner}/{repo}/environments/{environment_name}', {
      owner,
      repo,
      environment_name: environment,
    });
    environmentConfigured = true;
  } catch {
    environmentConfigured = false;
  }

  const dependencyResolved =
    workflow.includes('aws-actions/configure-aws-credentials@v4') &&
    workflow.includes('id-token: write') &&
    workflow.includes('DSGOneStack-$ENVIRONMENT');
  const testable =
    workflow.includes('Verify Deployment') &&
    workflow.includes('cloudformation describe-stacks') &&
    workflow.includes('verification-manifest.json');
  const auditHookAvailable =
    workflow.includes('Upload verification evidence') &&
    workflow.includes('aws-verification-evidence-');
  const secretBound = missingRepositorySecrets.length === 0;

  return {
    secret_bound: secretBound,
    dependency_resolved: dependencyResolved,
    testable,
    deploy_target_ready: environmentConfigured && secretBound && dependencyResolved,
    audit_hook_available: auditHookAvailable,
    environmentConfigured,
    missingRepositorySecrets,
    workflowRef: ref,
  };
}

async function findExistingAwsDispatch(
  octokit: Octokit,
  owner: string,
  repo: string,
  environment: string,
  idempotencyKey: string,
): Promise<{ id: number; status: string | null; conclusion: string | null; htmlUrl: string } | null> {
  const expectedTitle = `DSG CDK ${environment} ${idempotencyKey}`;
  const runs = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: 'cdk-deploy.yml',
    per_page: 100,
  });

  for (const run of runs.data.workflow_runs) {
    if (run.display_title === expectedTitle) {
      return {
        id: run.id,
        status: run.status ?? null,
        conclusion: run.conclusion ?? null,
        htmlUrl: run.html_url,
      };
    }
  }
  return null;
}

async function handleAwsDeploy(
  args: Record<string, unknown>,
  auth: UnifiedAuthContext,
): Promise<UnifiedToolResult> {
  if (!hasMutationRole(auth)) {
    return { ok: false, code: -32001, message: 'AWS deployment requires operator or org_admin entitlement.' };
  }

  const environment = String(args.environment ?? '');
  if (!['dev', 'staging', 'prod'].includes(environment)) {
    return { ok: false, code: -32602, message: 'environment must be dev, staging, or prod' };
  }

  const idempotencyKey = String(args.idempotencyKey ?? '').trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return { ok: false, code: -32602, message: 'idempotencyKey must contain 8 to 128 characters' };
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
    return { ok: false, code: -32602, message: 'idempotencyKey contains unsupported characters' };
  }

  if (args.approved !== true) {
    return {
      ok: true,
      result: {
        verdict: 'REVIEW',
        dispatched: false,
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

  const workflowRef = process.env.DSG_AWS_DEPLOY_REF ?? 'main';
  const octokit = new Octokit({ auth: token });
  const evidence = await inspectAwsDeployEvidence(
    octokit,
    owner,
    repo,
    environment,
    workflowRef,
  );

  const gate = await callDsgTool('dsg.evaluate', {
    action: `deploy.aws.${environment}`,
    actor: auth.actorId,
    tool: 'github-actions:cdk-deploy',
    args: {
      environment,
      idempotencyKey,
      secret_bound: evidence.secret_bound,
      dependency_resolved: evidence.dependency_resolved,
      testable: evidence.testable,
      deploy_target_ready: evidence.deploy_target_ready,
      audit_hook_available: evidence.audit_hook_available,
    },
    env: {
      riskLevel: environment === 'prod' ? 'critical' : 'high',
      policyRef: 'dsg-aws-agent-toolkit-v1',
    },
  });

  if (!gate.ok) return gate;
  const decision = gate.result as Record<string, unknown>;
  if (decision.gateStatus !== 'PASS') {
    const missingEvidence = [
      ['secret_bound', evidence.secret_bound],
      ['dependency_resolved', evidence.dependency_resolved],
      ['testable', evidence.testable],
      ['deploy_target_ready', evidence.deploy_target_ready],
      ['audit_hook_available', evidence.audit_hook_available],
    ]
      .filter(([, passed]) => passed !== true)
      .map(([name]) => name);

    return {
      ok: true,
      result: {
        verdict: decision.gateStatus ?? 'BLOCK',
        dispatched: false,
        gate: decision,
        evidence,
        missingEvidence,
        nextAction: 'Resolve the reported AWS evidence bindings before any mutation.',
      },
    };
  }

  const existing = await findExistingAwsDispatch(
    octokit,
    owner,
    repo,
    environment,
    idempotencyKey,
  );
  if (existing) {
    return {
      ok: true,
      result: {
        verdict: 'REVIEW',
        dispatched: false,
        duplicateSuppressed: true,
        environment,
        idempotencyKey,
        existingRun: existing,
        gate: decision,
        evidence,
        nextAction: 'Reuse the existing workflow run and its verification evidence instead of dispatching a duplicate.',
      },
    };
  }

  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: 'cdk-deploy.yml',
    ref: workflowRef,
    inputs: {
      environment,
      approval_required: 'true',
      idempotency_key: idempotencyKey,
    },
  });

  return {
    ok: true,
    result: {
      verdict: 'REVIEW',
      dispatched: true,
      environment,
      idempotencyKey,
      gate: decision,
      evidence,
      workflow: 'cdk-deploy.yml',
      nextAction:
        'Wait for protected-environment approval and post-deploy verification evidence. Do not claim production readiness from dispatch success.',
    },
  };
}

export async function callUnifiedTool(
  name: UnifiedToolName,
  args: Record<string, unknown>,
  auth: UnifiedAuthContext,
): Promise<UnifiedToolResult> {
  try {
    switch (name) {
      case 'dsg.system.status':
        return handleSystemStatus(auth);
      case 'dsg.aimo.status':
        return await handleAimoStatus();
      case 'dsg.aimo.solve':
        return await handleAimoSolve(args);
      case 'dsg.aws.contract':
        return handleAwsContract();
      case 'dsg.aws.deploy':
        return await handleAwsDeploy(args, auth);
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
