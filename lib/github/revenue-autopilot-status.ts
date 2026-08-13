export const DEFAULT_REVENUE_AUTOPILOT_REPOSITORY =
  'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';

export const REVENUE_AUTOPILOT_WORKFLOW = 'revenue-autopilot.yml';

export type GitHubWorkflowRun = {
  id?: number;
  run_number?: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  head_branch?: string;
  head_sha?: string;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type GitHubWorkflowResponse = {
  workflow_runs?: GitHubWorkflowRun[];
};

export function resolveGitHubRepository(value?: string | null) {
  const candidate = String(value || '').trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate)
    ? candidate
    : DEFAULT_REVENUE_AUTOPILOT_REPOSITORY;
}

export function summarizeWorkflowRun(payload: GitHubWorkflowResponse) {
  const run = Array.isArray(payload.workflow_runs)
    ? payload.workflow_runs[0]
    : undefined;
  if (!run || !run.id || !run.run_number) return null;

  return {
    id: run.id,
    number: run.run_number,
    name: run.name || 'Revenue Autopilot',
    status: run.status || 'unknown',
    conclusion: run.conclusion || null,
    branch: run.head_branch || 'unknown',
    sha: run.head_sha || '',
    url: run.html_url || '',
    createdAt: run.created_at || '',
    updatedAt: run.updated_at || '',
  };
}
