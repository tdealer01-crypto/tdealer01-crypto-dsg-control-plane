import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import azureGitHubOidcIdentity from '@/config/azure-github-oidc-identity.json';
import { verifyGitHubActionsOidcToken } from '@/lib/security/github-actions-oidc';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const ROUTE = 'api/dsg/ops/runner-bootstrap/broker';
const OIDC_AUDIENCE = 'dsg-agi-runner-bootstrap';
const CONTROL_REPOSITORY = 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';
const CONTROL_WORKFLOW = '.github/workflows/bootstrap-agi-pr-validation-runner.yml';
const TARGET_REPOSITORY = 'tdealer01-crypto/dsg-agi-simulation';
const TARGET_BRANCH = 'fix/runtime-baseline-capability-evolution';
const RUNNER_NAME = 'dsg-pr41-validator';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BrokerRequest {
  action: 'issue' | 'status';
  targetRepository: string;
  targetBranch: string;
  runnerName?: string;
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function isBrokerRequest(value: unknown): value is BrokerRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    (body.action === 'issue' || body.action === 'status') &&
    typeof body.targetRepository === 'string' &&
    typeof body.targetBranch === 'string' &&
    (body.runnerName === undefined || typeof body.runnerName === 'string')
  );
}

function loadBrokerConfig():
  | {
      githubToken: string;
      azureClientId: string;
      azureTenantId: string;
      azureSubscriptionId: string;
      azureResourceGroup: string;
    }
  | { missing: string[] } {
  const githubToken = process.env.DSG_GITHUB_AUTOMATION_TOKEN?.trim();
  const azureClientId = process.env.DSG_AZURE_GITHUB_OIDC_CLIENT_ID?.trim() || azureGitHubOidcIdentity.clientId;
  const azureTenantId = process.env.DSG_AZURE_GITHUB_OIDC_TENANT_ID?.trim() || azureGitHubOidcIdentity.tenantId;
  const azureSubscriptionId =
    process.env.DSG_AZURE_GITHUB_OIDC_SUBSCRIPTION_ID?.trim() || azureGitHubOidcIdentity.subscriptionId;
  const azureResourceGroup =
    process.env.DSG_AZURE_GITHUB_OIDC_RESOURCE_GROUP?.trim() || azureGitHubOidcIdentity.resourceGroup;

  const missing = [
    ...(!githubToken ? ['DSG_GITHUB_AUTOMATION_TOKEN'] : []),
    ...(!UUID_RE.test(azureClientId) ? ['DSG_AZURE_GITHUB_OIDC_CLIENT_ID'] : []),
    ...(!UUID_RE.test(azureTenantId) ? ['DSG_AZURE_GITHUB_OIDC_TENANT_ID'] : []),
    ...(!UUID_RE.test(azureSubscriptionId) ? ['DSG_AZURE_GITHUB_OIDC_SUBSCRIPTION_ID'] : []),
    ...(!azureResourceGroup ? ['DSG_AZURE_GITHUB_OIDC_RESOURCE_GROUP'] : []),
  ];
  if (missing.length > 0) return { missing };

  return {
    githubToken: githubToken!,
    azureClientId,
    azureTenantId,
    azureSubscriptionId,
    azureResourceGroup,
  };
}

async function authorize(request: Request): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const token = bearerToken(request);
  if (!token || token.split('.').length !== 3) {
    return {
      ok: false,
      response: NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_OIDC_REQUIRED' }, { status: 401 }),
    };
  }

  const verified = await verifyGitHubActionsOidcToken(token, {
    audience: OIDC_AUDIENCE,
    repository: CONTROL_REPOSITORY,
    ref: 'refs/heads/main',
    workflowPath: CONTROL_WORKFLOW,
    allowedEvents: ['push', 'workflow_dispatch'],
  });
  if (verified.ok === false) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_OIDC_INVALID', detail: verified.error },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const auth = await authorize(request);
    if (auth.ok === false) return auth.response;

    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_INVALID_JSON' }, { status: 400, headers });
    }
    if (!isBrokerRequest(parsed)) {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_PAYLOAD_INVALID' }, { status: 400, headers });
    }
    if (parsed.targetRepository !== TARGET_REPOSITORY || parsed.targetBranch !== TARGET_BRANCH) {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_TARGET_NOT_ALLOWLISTED' }, { status: 403, headers });
    }
    if (parsed.runnerName !== undefined && parsed.runnerName !== RUNNER_NAME) {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_RUNNER_NOT_ALLOWLISTED' }, { status: 403, headers });
    }

    const config = loadBrokerConfig();
    if ('missing' in config) {
      return NextResponse.json(
        { status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_RUNTIME_NOT_CONFIGURED', missing: config.missing },
        { status: 503, headers },
      );
    }

    const [owner, repo] = TARGET_REPOSITORY.split('/');
    const octokit = new Octokit({ auth: config.githubToken });
    const branch = await octokit.rest.repos.getBranch({ owner, repo, branch: TARGET_BRANCH });
    const targetSha = branch.data.commit.sha;
    if (!/^[0-9a-f]{40}$/i.test(targetSha)) {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_TARGET_SHA_INVALID' }, { status: 502, headers });
    }

    if (parsed.action === 'status') {
      const runners = await octokit.rest.actions.listSelfHostedRunnersForRepo({ owner, repo, per_page: 100 });
      const runner = runners.data.runners.find((candidate) => candidate.name === RUNNER_NAME);
      return NextResponse.json(
        {
          schemaVersion: 'dsg.runner-bootstrap-broker.v1',
          status: 'PASS',
          action: 'status',
          targetRepository: TARGET_REPOSITORY,
          targetBranch: TARGET_BRANCH,
          targetSha,
          runner: runner
            ? {
                id: runner.id,
                name: runner.name,
                status: runner.status,
                busy: runner.busy,
                labels: runner.labels.map(({ name }) => name).sort(),
              }
            : null,
        },
        { status: 200, headers },
      );
    }

    const registration = await octokit.rest.actions.createRegistrationTokenForRepo({ owner, repo });
    const registrationToken = registration.data.token;
    if (typeof registrationToken !== 'string' || registrationToken.length < 20) {
      return NextResponse.json({ status: 'BLOCK', reason: 'RUNNER_BOOTSTRAP_REGISTRATION_TOKEN_INVALID' }, { status: 502, headers });
    }

    return NextResponse.json(
      {
        schemaVersion: 'dsg.runner-bootstrap-broker.v1',
        status: 'PASS',
        action: 'issue',
        targetRepository: TARGET_REPOSITORY,
        targetBranch: TARGET_BRANCH,
        targetSha,
        azure: {
          clientId: config.azureClientId,
          tenantId: config.azureTenantId,
          subscriptionId: config.azureSubscriptionId,
          resourceGroup: config.azureResourceGroup,
        },
        runner: {
          name: RUNNER_NAME,
          registrationToken,
          expiresAt: registration.data.expires_at,
        },
        truthBoundary:
          'The long-lived GitHub automation token remains inside the Control Plane runtime. Azure values come from the execution-verified GitHub OIDC identity binding (or dedicated DSG_AZURE_GITHUB_OIDC_* overrides), and the response contains only non-secret Azure identifiers plus a short-lived runner registration token.',
      },
      { status: 200, headers },
    );
  } catch (error) {
    return handleApiError(ROUTE, error, { status: 502, headers });
  }
}
