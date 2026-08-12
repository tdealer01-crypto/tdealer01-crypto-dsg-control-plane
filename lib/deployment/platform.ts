/**
 * Platform-agnostic deployment identity.
 *
 * The repo was written against Vercel's injected environment
 * (`VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV`, `VERCEL_URL`, ...). None of those
 * exist on Render, so reading them directly makes deployment identity silently
 * degrade to `local`/`unknown` and breaks the go/no-go evidence chain in
 * docs/RUNBOOK_DEPLOY.md.
 *
 * Resolution order for every field: explicit app config first, then whichever
 * managed host we are actually running on, then a local fallback. Env is read
 * at call time, not module scope, so tests can mutate `process.env`.
 *
 * Platform variables consumed:
 * - Vercel: VERCEL, VERCEL_ENV, VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_REF,
 *   VERCEL_DEPLOYMENT_ID, VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL
 * - Render: RENDER, RENDER_GIT_COMMIT, RENDER_GIT_BRANCH, RENDER_EXTERNAL_URL,
 *   RENDER_EXTERNAL_HOSTNAME, RENDER_SERVICE_NAME, RENDER_SERVICE_ID,
 *   RENDER_INSTANCE_ID, IS_PULL_REQUEST
 * - GitHub Actions: GITHUB_ACTIONS, GITHUB_SHA, GITHUB_REF_NAME
 */

export type DeploymentPlatform = 'vercel' | 'render' | 'github-actions' | 'local';

export type DeploymentEnvironment = 'production' | 'preview' | 'development' | 'local';

export interface DeploymentIdentity {
  /** Which host injected the metadata below. */
  platform: DeploymentPlatform;
  /** Full commit SHA, or 'local' when nothing supplied one. */
  commit: string;
  /** First 7 characters of `commit`, for display. */
  commitShort: string;
  /** Branch or ref name, when the host exposes it. */
  branch: string | null;
  /** Deployment lifecycle stage, normalized across hosts. */
  env: DeploymentEnvironment;
  /** Host-assigned deployment/instance identifier, when available. */
  deploymentId: string | null;
  /** Absolute origin including scheme, e.g. https://app.onrender.com. */
  externalUrl: string | null;
  /** Host-assigned service name, when available. */
  serviceName: string | null;
  /**
   * True when running on a managed host (Vercel or Render) rather than a
   * developer machine. Use this instead of `Boolean(process.env.VERCEL)` —
   * that check reads false on Render and silently relaxes gates written to
   * fail closed in deployed environments.
   */
  isManagedHost: boolean;
}

const UNKNOWN_COMMIT = 'local';

function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/** Normalize a host or origin into an absolute origin with a scheme. */
function toAbsoluteOrigin(value: string | null): string | null {
  if (!value) return null;
  // Vercel exposes bare hostnames (VERCEL_URL); Render includes the scheme.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export function detectPlatform(): DeploymentPlatform {
  if (process.env.VERCEL) return 'vercel';
  if (process.env.RENDER) return 'render';
  if (process.env.GITHUB_ACTIONS) return 'github-actions';
  return 'local';
}

function resolveEnvironment(platform: DeploymentPlatform): DeploymentEnvironment {
  if (platform === 'vercel') {
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
      return vercelEnv;
    }
  }

  if (platform === 'render') {
    // Render has no VERCEL_ENV analogue. PR previews set IS_PULL_REQUEST=true;
    // everything else is classified from NODE_ENV.
    if (process.env.IS_PULL_REQUEST === 'true') return 'preview';
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }

  if (platform === 'local' || platform === 'github-actions') {
    return process.env.NODE_ENV === 'production' ? 'production' : 'local';
  }

  return 'local';
}

export function getDeploymentIdentity(): DeploymentIdentity {
  const platform = detectPlatform();

  const commit =
    firstNonEmpty(
      process.env.VERCEL_GIT_COMMIT_SHA,
      process.env.RENDER_GIT_COMMIT,
      process.env.GIT_COMMIT_SHA,
      process.env.GITHUB_SHA,
    ) ?? UNKNOWN_COMMIT;

  const branch = firstNonEmpty(
    process.env.VERCEL_GIT_COMMIT_REF,
    process.env.RENDER_GIT_BRANCH,
    process.env.GITHUB_REF_NAME,
  );

  const deploymentId = firstNonEmpty(
    process.env.VERCEL_DEPLOYMENT_ID,
    process.env.RENDER_INSTANCE_ID,
    process.env.RENDER_SERVICE_ID,
  );

  const externalUrl = toAbsoluteOrigin(
    firstNonEmpty(
      // Explicit app config wins: it is the only value that survives a host move.
      process.env.APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.RENDER_EXTERNAL_URL,
      process.env.RENDER_EXTERNAL_HOSTNAME,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
    ),
  );

  const serviceName = firstNonEmpty(process.env.RENDER_SERVICE_NAME);

  return {
    platform,
    commit,
    commitShort: commit === UNKNOWN_COMMIT ? commit : commit.slice(0, 7),
    branch,
    env: resolveEnvironment(platform),
    deploymentId,
    externalUrl,
    serviceName,
    isManagedHost: platform === 'vercel' || platform === 'render',
  };
}

/** Commit SHA of the running deployment, or 'local'. */
export function getDeploymentCommit(): string {
  return getDeploymentIdentity().commit;
}

/** Normalized deployment stage of the running deployment. */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  return getDeploymentIdentity().env;
}

/**
 * Absolute public origin of this deployment, scheme included.
 *
 * Prefer this over `process.env.VERCEL_URL` when building redirect/callback
 * URLs: `VERCEL_URL` is a bare hostname, so interpolating it directly yields a
 * scheme-less string that external services (Stripe, OAuth) reject.
 */
export function getPublicOrigin(fallback = 'http://localhost:3000'): string {
  return getDeploymentIdentity().externalUrl ?? fallback;
}

/** True when running on Vercel or Render rather than a developer machine. */
export function isManagedHost(): boolean {
  return getDeploymentIdentity().isManagedHost;
}
