// ============================================================================
// Candidate provenance — independent GitHub-backed lineage verification
// ============================================================================
//
// Everything the promotion/evaluate route checked before this module existed
// (approvedPlanHash, planAligned, constraintsPassed, baseline/candidate SHAs)
// came straight from the envelope the caller sent. That proves internal
// consistency of the payload, never that the payload describes something
// that actually happened on GitHub. This module is the independent check:
// it fetches the approved plan and the commit range directly from GitHub
// with a server-side credential and recomputes the answer itself.
//
// Two things it verifies that nothing else in this codebase did before:
//   1. the approved plan file at the candidate commit hashes to exactly what
//      the envelope claims, is authored by DSG_CONTROL_PLANE, is approved,
//      and targets this repository;
//   2. the candidate commit is a strict descendant of the baseline commit
//      (GitHub compare status "ahead"), and every changed file is inside the
//      plan's allowedPaths.
//
// Absent/misconfigured credentials, network failures, and API errors all
// fail closed (BLOCK), never open.

import { createHash } from 'node:crypto';
import { Octokit } from '@octokit/rest';
import { ALLOWED_REPOSITORIES } from './github-branch-bootstrap';

export type LineageFailureCode =
  | 'REPOSITORY_NOT_ALLOWED'
  | 'REPOSITORY_FORMAT_INVALID'
  | 'GITHUB_CREDENTIAL_MISSING'
  | 'APPROVED_PLAN_PATH_UNKNOWN'
  | 'APPROVED_PLAN_FETCH_FAILED'
  | 'APPROVED_PLAN_CONTENT_INVALID'
  | 'APPROVED_PLAN_HASH_MISMATCH'
  | 'APPROVED_PLAN_NOT_APPROVED'
  | 'APPROVED_PLAN_AUTHORITY_INVALID'
  | 'APPROVED_PLAN_TARGET_MISMATCH'
  | 'CANDIDATE_COMPARE_FAILED'
  | 'BASELINE_NOT_ANCESTOR'
  | 'DIFF_EMPTY'
  | 'DIFF_OUTSIDE_ALLOWED_PATHS';

export interface LineageFailure {
  code: LineageFailureCode;
  message: string;
}

export interface GitHubLineageClient {
  getContent(input: { owner: string; repo: string; path: string; ref: string }): Promise<{ data: unknown }>;
  compareCommits(input: { owner: string; repo: string; basehead: string }): Promise<{
    data: { status: string; ahead_by: number; behind_by: number; files?: Array<{ filename: string }> };
  }>;
}

/**
 * Where the approved plan document lives per repository. A repository absent
 * from this map fails closed (APPROVED_PLAN_PATH_UNKNOWN) rather than
 * guessing a conventional path.
 */
const APPROVED_PLAN_PATH_BY_REPOSITORY: Record<string, string> = {
  'tdealer01-crypto/dsg-agi-simulation': 'contracts/agentic-improvement/self-evolution-plan.json',
};

function splitRepository(repository: string): { owner: string; repo: string } | null {
  const [owner, repo, extra] = repository.split('/');
  return owner && repo && !extra ? { owner, repo } : null;
}

export async function verifyApprovedPlan(
  client: GitHubLineageClient,
  repository: string,
  ref: string,
  expectedPlanHash: string,
): Promise<LineageFailure[]> {
  const repo = splitRepository(repository);
  if (!repo) return [{ code: 'REPOSITORY_FORMAT_INVALID', message: 'targetRepository must be "owner/repo".' }];

  const path = APPROVED_PLAN_PATH_BY_REPOSITORY[repository];
  if (!path) {
    return [{ code: 'APPROVED_PLAN_PATH_UNKNOWN', message: `No approved-plan path is registered for ${repository}.` }];
  }

  let response: { data: unknown };
  try {
    response = await client.getContent({ ...repo, path, ref });
  } catch (error) {
    return [{
      code: 'APPROVED_PLAN_FETCH_FAILED',
      message: `Could not fetch ${path}@${ref}: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }

  const data = response.data as { content?: string; encoding?: string };
  if (typeof data.content !== 'string' || data.encoding !== 'base64') {
    return [{ code: 'APPROVED_PLAN_CONTENT_INVALID', message: 'Approved plan response did not carry base64 file content.' }];
  }

  const raw = Buffer.from(data.content, 'base64');
  const actualHash = createHash('sha256').update(raw).digest('hex');
  if (actualHash !== expectedPlanHash) {
    return [{
      code: 'APPROVED_PLAN_HASH_MISMATCH',
      message: `Approved plan at ${ref} hashes to ${actualHash}, envelope claims ${expectedPlanHash}.`,
    }];
  }

  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(raw.toString('utf8'));
  } catch {
    return [{ code: 'APPROVED_PLAN_CONTENT_INVALID', message: 'Approved plan is not valid JSON.' }];
  }

  const failures: LineageFailure[] = [];
  if (plan.authority !== 'DSG_CONTROL_PLANE') {
    failures.push({ code: 'APPROVED_PLAN_AUTHORITY_INVALID', message: 'Approved plan authority is not DSG_CONTROL_PLANE.' });
  }
  if (typeof plan.approvalStatus !== 'string' || !plan.approvalStatus.startsWith('APPROVED_')) {
    failures.push({ code: 'APPROVED_PLAN_NOT_APPROVED', message: 'Approved plan approvalStatus does not start with APPROVED_.' });
  }
  if (plan.targetRepository !== repository) {
    failures.push({ code: 'APPROVED_PLAN_TARGET_MISMATCH', message: 'Approved plan targetRepository does not match the candidate repository.' });
  }
  return failures;
}

export async function verifyCandidateLineage(
  client: GitHubLineageClient,
  repository: string,
  baselineCommit: string,
  candidateCommit: string,
  allowedPaths: string[],
): Promise<LineageFailure[]> {
  const repo = splitRepository(repository);
  if (!repo) return [{ code: 'REPOSITORY_FORMAT_INVALID', message: 'targetRepository must be "owner/repo".' }];

  let response: { data: { status: string; files?: Array<{ filename: string }> } };
  try {
    response = await client.compareCommits({ ...repo, basehead: `${baselineCommit}...${candidateCommit}` });
  } catch (error) {
    return [{
      code: 'CANDIDATE_COMPARE_FAILED',
      message: `Could not compare ${baselineCommit}...${candidateCommit}: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }

  const failures: LineageFailure[] = [];
  if (response.data.status !== 'ahead') {
    failures.push({
      code: 'BASELINE_NOT_ANCESTOR',
      message: `GitHub reports baseline...candidate as "${response.data.status}", expected "ahead" (baseline must be a strict ancestor of candidate).`,
    });
  }

  const changedFiles = response.data.files ?? [];
  if (changedFiles.length === 0) {
    failures.push({ code: 'DIFF_EMPTY', message: 'Candidate commit contains no file changes versus baseline.' });
  }

  const allowed = new Set(allowedPaths);
  const outOfScope = changedFiles.filter((file) => !allowed.has(file.filename));
  if (outOfScope.length > 0) {
    failures.push({
      code: 'DIFF_OUTSIDE_ALLOWED_PATHS',
      message: `Candidate changes files outside allowedPaths: ${outOfScope.map((file) => file.filename).join(', ')}.`,
    });
  }

  return failures;
}

export async function verifyCandidateProvenance(
  repository: string,
  baselineCommit: string,
  candidateCommit: string,
  allowedPaths: string[],
  approvedPlanHash: string,
): Promise<LineageFailure[]> {
  if (!ALLOWED_REPOSITORIES.has(repository)) {
    return [{ code: 'REPOSITORY_NOT_ALLOWED', message: `${repository} is not in the governed-repository allowlist.` }];
  }

  const token = process.env.DSG_GITHUB_AUTOMATION_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return [{ code: 'GITHUB_CREDENTIAL_MISSING', message: 'Server-side GitHub automation credential is not configured.' }];
  }

  const octokit = new Octokit({ auth: token });
  const client: GitHubLineageClient = {
    getContent: (input) => octokit.rest.repos.getContent(input) as unknown as Promise<{ data: unknown }>,
    compareCommits: (input) =>
      octokit.rest.repos.compareCommitsWithBasehead(input) as unknown as Promise<{
        data: { status: string; ahead_by: number; behind_by: number; files?: Array<{ filename: string }> };
      }>,
  };

  const [planFailures, lineageFailures] = await Promise.all([
    verifyApprovedPlan(client, repository, candidateCommit, approvedPlanHash),
    verifyCandidateLineage(client, repository, baselineCommit, candidateCommit, allowedPaths),
  ]);
  return [...planFailures, ...lineageFailures];
}
