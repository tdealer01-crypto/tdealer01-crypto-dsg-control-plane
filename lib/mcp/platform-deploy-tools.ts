import { Octokit } from '@octokit/rest';
import { callDsgTool } from './dsg-tools';
import type { UnifiedAuthContext } from './unified-auth';

export const PLATFORM_DEPLOY_TOOL_SCHEMAS = {
  'dsg.deploy.status': {
    description:
      'Return governed deployment adapter readiness for Netlify, Render, and Supabase. GitHub Actions is the dispatcher and evidence boundary.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  'dsg.deploy.execute': {
    description:
      'Gate and idempotently dispatch a governed deployment to Netlify, Render, or Supabase. Dispatch success remains REVIEW until provider evidence is verified.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['netlify', 'render', 'supabase'] },
        environment: { type: 'string', enum: ['preview', 'staging', 'prod'] },
        approved: {
          type: 'boolean',
          description: 'Explicit operator approval for this exact deployment plan.',
        },
        idempotencyKey: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          description: 'Stable request identifier reused on retries of the same intended deployment.',
        },
        ref: {
          type: 'string',
          minLength: 1,
          maxLength: 160,
          description: 'Optional Git ref to deploy. Provider configuration still controls what is accepted.',
        },
        supabaseMode: {
          type: 'string',
          enum: ['migrations', 'functions', 'all'],
          description: 'Supabase-only mutation surface. Defaults to all.',
        },
      },
      required: ['target', 'environment', 'approved', 'idempotencyKey'],
      additionalProperties: false,
    },
  },
} as const;

export type PlatformDeployToolName = keyof typeof PLATFORM_DEPLOY_TOOL_SCHEMAS;
export const PLATFORM_DEPLOY_TOOL_NAMES = Object.keys(
  PLATFORM_DEPLOY_TOOL_SCHEMAS,
) as PlatformDeployToolName[];

export type PlatformDeployToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

type DeployTarget = 'netlify' | 'render' | 'supabase';
type DeployEnvironment = 'preview' | 'staging' | 'prod';

type DeploymentEvidence = {
  secret_bound: boolean;
  dependency_resolved: boolean;
  testable: boolean;
  deploy_target_ready: boolean;
  audit_hook_available: boolean;
  missingRepositorySecrets: string[];
  workflowRef: string;
  workflowPath: string;
};

const WORKFLOW_PATH = '.github/workflows/dsg-platform-deploy.yml';
const WORKFLOW_ID = 'dsg-platform-deploy.yml';

const REQUIRED_SECRETS: Record<DeployTarget, readonly string[]> = {
  netlify: ['NETLIFY_BUILD_HOOK_URL'],
  render: ['RENDER_DEPLOY_HOOK_URL'],
  supabase: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD'],
};

function hasMutationRole(auth: UnifiedAuthContext): boolean {
  return auth.roles.includes('operator') || auth.roles.includes('org_admin');
}

function githubToken(): string | null {
  return (
    process.env.DSG_GITHUB_AUTOMATION_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    null
  );
}

function repositoryName(): { owner: string; repo: string } | null {
  const repository =
    process.env.DSG_CONTROL_PLANE_REPOSITORY ??
    'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

function workflowRef(): string {
  return process.env.DSG_PLATFORM_DEPLOY_REF?.trim() || 'main';
}

function decodeGitHubContent(content: string | undefined, encoding: string | undefined): string {
  if (!content) return '';
  return encoding === 'base64'
    ? Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8')
    : content;
}

function validateTarget(value: unknown): DeployTarget | null {
  return value === 'netlify' || value === 'render' || value === 'supabase'
    ? value
    : null;
}

function validateEnvironment(value: unknown): DeployEnvironment | null {
  return value === 'preview' || value === 'staging' || value === 'prod'
    ? value
    : null;
}

function validateIdempotencyKey(value: unknown): string | null {
  const key = String(value ?? '').trim();
  if (key.length < 8 || key.length > 128) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) return null;
  return key;
}

function validateRef(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return '';
  const ref = String(value).trim();
  if (!ref || ref.length > 160) return null;
  if (!/^[A-Za-z0-9._/@:-]+$/.test(ref)) return null;
  if (ref.includes('..') || ref.startsWith('-')) return null;
  return ref;
}

function validateSupabaseMode(value: unknown): 'migrations' | 'functions' | 'all' | null {
  if (value === undefined || value === null || value === '') return 'all';
  return value === 'migrations' || value === 'functions' || value === 'all'
    ? value
    : null;
}

async function inspectDeploymentEvidence(
  octokit: Octokit,
  owner: string,
  repo: string,
  target: DeployTarget,
  ref: string,
): Promise<DeploymentEvidence> {
  let workflow = '';
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: WORKFLOW_PATH,
      ref,
    });
    if (!Array.isArray(response.data) && 'content' in response.data) {
      workflow = decodeGitHubContent(response.data.content, response.data.encoding);
    }
  } catch {
    workflow = '';
  }

  const secretNames = new Set<string>();
  try {
    const response = await octokit.rest.actions.listRepoSecrets({ owner, repo, per_page: 100 });
    for (const secret of response.data.secrets) secretNames.add(secret.name);
  } catch {
    // Fail closed if secret binding cannot be verified with the configured GitHub credential.
  }

  const missingRepositorySecrets = REQUIRED_SECRETS[target].filter(
    (name) => !secretNames.has(name),
  );

  const dependencyResolved =
    workflow.includes("target:") &&
    workflow.includes("netlify") &&
    workflow.includes("render") &&
    workflow.includes("supabase") &&
    !workflow.toLowerCase().includes('vercel');
  const testable =
    workflow.includes('deployment-evidence.json') &&
    workflow.includes('actions/upload-artifact@v4');
  const auditHookAvailable =
    workflow.includes('idempotency_key') &&
    workflow.includes('run-name: DSG Platform');
  const secretBound = missingRepositorySecrets.length === 0;

  return {
    secret_bound: secretBound,
    dependency_resolved: dependencyResolved,
    testable,
    deploy_target_ready: secretBound && dependencyResolved && testable,
    audit_hook_available: auditHookAvailable,
    missingRepositorySecrets,
    workflowRef: ref,
    workflowPath: WORKFLOW_PATH,
  };
}

async function findExistingDispatch(
  octokit: Octokit,
  owner: string,
  repo: string,
  target: DeployTarget,
  environment: DeployEnvironment,
  idempotencyKey: string,
): Promise<{ id: number; status: string | null; conclusion: string | null; htmlUrl: string } | null> {
  const expectedTitle = `DSG Platform ${target} ${environment} ${idempotencyKey}`;
  const runs = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: WORKFLOW_ID,
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

async function handleStatus(): Promise<PlatformDeployToolResult> {
  const token = githubToken();
  const repo = repositoryName();
  if (!token || !repo) {
    return {
      ok: true,
      result: {
        verdict: 'BLOCK',
        dispatcher: 'github-actions',
        targets: ['netlify', 'render', 'supabase'],
        vercelSupported: false,
        githubCredentialConfigured: Boolean(token),
        repositoryConfigured: Boolean(repo),
        nextAction: 'Configure the GitHub automation credential and repository binding before deployment.',
      },
    };
  }

  const octokit = new Octokit({ auth: token });
  const ref = workflowRef();
  const readiness: Record<string, DeploymentEvidence> = {};
  for (const target of ['netlify', 'render', 'supabase'] as const) {
    readiness[target] = await inspectDeploymentEvidence(
      octokit,
      repo.owner,
      repo.repo,
      target,
      ref,
    );
  }

  const allReady = Object.values(readiness).every(
    (item) => item.deploy_target_ready && item.audit_hook_available,
  );

  return {
    ok: true,
    result: {
      verdict: allReady ? 'PASS' : 'REVIEW',
      dispatcher: 'github-actions',
      targets: ['netlify', 'render', 'supabase'],
      vercelSupported: false,
      workflow: WORKFLOW_PATH,
      readiness,
      truthBoundary:
        'Adapter readiness is not deployment success. A dispatch remains REVIEW until provider-side evidence is captured and verified.',
    },
  };
}

async function handleExecute(
  args: Record<string, unknown>,
  auth: UnifiedAuthContext,
): Promise<PlatformDeployToolResult> {
  if (!hasMutationRole(auth)) {
    return {
      ok: false,
      code: -32001,
      message: 'Platform deployment requires operator or org_admin entitlement.',
    };
  }

  const target = validateTarget(args.target);
  if (!target) {
    return {
      ok: false,
      code: -32602,
      message: 'target must be netlify, render, or supabase. Vercel is intentionally unsupported.',
    };
  }

  const environment = validateEnvironment(args.environment);
  if (!environment) {
    return { ok: false, code: -32602, message: 'environment must be preview, staging, or prod' };
  }

  const idempotencyKey = validateIdempotencyKey(args.idempotencyKey);
  if (!idempotencyKey) {
    return {
      ok: false,
      code: -32602,
      message: 'idempotencyKey must be 8-128 characters using letters, digits, dot, underscore, colon, or dash',
    };
  }

  const ref = validateRef(args.ref);
  if (ref === null) {
    return { ok: false, code: -32602, message: 'ref contains unsupported characters' };
  }

  const supabaseMode = validateSupabaseMode(args.supabaseMode);
  if (!supabaseMode) {
    return {
      ok: false,
      code: -32602,
      message: 'supabaseMode must be migrations, functions, or all',
    };
  }

  if (target !== 'supabase' && args.supabaseMode !== undefined) {
    return {
      ok: false,
      code: -32602,
      message: 'supabaseMode is only valid when target=supabase',
    };
  }

  if (args.approved !== true) {
    return {
      ok: true,
      result: {
        verdict: 'REVIEW',
        dispatched: false,
        target,
        environment,
        nextAction: 'Set approved=true only after approving this exact target, environment, ref, and mutation scope.',
      },
    };
  }

  const token = githubToken();
  if (!token) {
    return {
      ok: false,
      code: -32030,
      message: 'Server-side GitHub workflow credential is not configured. Deployment remains BLOCKED.',
    };
  }

  const repository = repositoryName();
  if (!repository) {
    return {
      ok: false,
      code: -32031,
      message: 'DSG_CONTROL_PLANE_REPOSITORY must be owner/repo',
    };
  }

  const dispatchRef = workflowRef();
  const octokit = new Octokit({ auth: token });
  const evidence = await inspectDeploymentEvidence(
    octokit,
    repository.owner,
    repository.repo,
    target,
    dispatchRef,
  );

  const gate = await callDsgTool('dsg.evaluate', {
    action: `deploy.${target}.${environment}`,
    actor: auth.actorId,
    tool: `github-actions:${WORKFLOW_ID}`,
    args: {
      target,
      environment,
      idempotencyKey,
      ref,
      supabaseMode: target === 'supabase' ? supabaseMode : undefined,
      secret_bound: evidence.secret_bound,
      dependency_resolved: evidence.dependency_resolved,
      testable: evidence.testable,
      deploy_target_ready: evidence.deploy_target_ready,
      audit_hook_available: evidence.audit_hook_available,
    },
    env: {
      riskLevel: environment === 'prod' ? 'critical' : 'high',
      policyRef: 'dsg-mcp-platform-deploy-v1',
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
        target,
        environment,
        gate: decision,
        evidence,
        missingEvidence,
        nextAction: 'Resolve the reported provider secret/workflow evidence bindings before mutation.',
      },
    };
  }

  const existing = await findExistingDispatch(
    octokit,
    repository.owner,
    repository.repo,
    target,
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
        target,
        environment,
        idempotencyKey,
        existingRun: existing,
        gate: decision,
        evidence,
        nextAction: 'Reuse the existing workflow run and verify its provider evidence instead of dispatching a duplicate.',
      },
    };
  }

  await octokit.rest.actions.createWorkflowDispatch({
    owner: repository.owner,
    repo: repository.repo,
    workflow_id: WORKFLOW_ID,
    ref: dispatchRef,
    inputs: {
      target,
      environment,
      idempotency_key: idempotencyKey,
      ref,
      supabase_mode: supabaseMode,
    },
  });

  return {
    ok: true,
    result: {
      verdict: 'REVIEW',
      dispatched: true,
      target,
      environment,
      idempotencyKey,
      workflow: WORKFLOW_PATH,
      gate: decision,
      evidence,
      nextAction:
        'Read the workflow run and deployment-evidence artifact. Do not claim PASS until provider-side verification succeeds.',
    },
  };
}

export async function callPlatformDeployTool(
  name: PlatformDeployToolName,
  args: Record<string, unknown>,
  auth: UnifiedAuthContext,
): Promise<PlatformDeployToolResult> {
  try {
    switch (name) {
      case 'dsg.deploy.status':
        return await handleStatus();
      case 'dsg.deploy.execute':
        return await handleExecute(args, auth);
      default:
        return {
          ok: false,
          code: -32601,
          message: `Unknown platform deployment tool: ${String(name)}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      code: -32603,
      message: error instanceof Error ? error.message : 'Platform deployment MCP tool error',
    };
  }
}
