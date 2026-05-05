import { createHash } from 'node:crypto';
import type { FileTree } from './file-tree';

export type GitHubWriteResult = {
  branch: string;
  commitSha: string;
  treeHash: string;
  baseCommitSha: string;
  githubTreeSha: string;
};

const GITHUB_API = 'https://api.github.com';

export async function writeTreeToGithubBranch(
  branch: string,
  tree: FileTree,
): Promise<GitHubWriteResult> {
  if (typeof branch !== 'string' || branch.trim().length === 0) throw new Error('DSG_BRANCH_REQUIRED');
  if (!tree?.treeHash || !Array.isArray(tree.files) || tree.files.length === 0) throw new Error('DSG_FILE_TREE_REQUIRED');

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('DSG_GITHUB_TOKEN_REQUIRED');

  const repo = process.env.DSG_TARGET_REPO ?? process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('DSG_GITHUB_REPO_REQUIRED');
  const repoMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(repo);
  if (!repoMatch) throw new Error('DSG_GITHUB_REPO_INVALID');
  const [, owner, name] = repoMatch;

  validateTree(tree);

  const baseRef = process.env.DSG_GITHUB_BASE_REF || 'main';
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  const baseRefResp = await githubRequest<{ object: { sha: string } }>(`${GITHUB_API}/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(baseRef)}`, { headers });
  const baseCommitSha = baseRefResp.object.sha;

  const baseCommit = await githubRequest<{ tree: { sha: string } }>(`${GITHUB_API}/repos/${owner}/${name}/git/commits/${baseCommitSha}`, { headers });

  let targetCommitSha = baseCommitSha;
  try {
    const targetRefResp = await githubRequest<{ object: { sha: string } }>(`${GITHUB_API}/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`, { headers });
    targetCommitSha = targetRefResp.object.sha;
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 404) throw error;
    await githubRequest(`${GITHUB_API}/repos/${owner}/${name}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseCommitSha }),
    });
  }

  const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
  for (const file of tree.files) {
    const blobResp = await githubRequest<{ sha: string }>(`${GITHUB_API}/repos/${owner}/${name}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
    });
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blobResp.sha });
  }

  const newTree = await githubRequest<{ sha: string }>(`${GITHUB_API}/repos/${owner}/${name}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries }),
  });

  const commitResp = await githubRequest<{ sha: string }>(`${GITHUB_API}/repos/${owner}/${name}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: `DSG app builder update (${tree.treeHash.slice(0, 12)})`,
      tree: newTree.sha,
      parents: [targetCommitSha],
    }),
  });

  await githubRequest(`${GITHUB_API}/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: commitResp.sha, force: false }),
  });

  if (commitResp.sha.startsWith('sim_')) throw new Error('DSG_GITHUB_COMMIT_SHA_INVALID');

  return { branch, commitSha: commitResp.sha, treeHash: tree.treeHash, baseCommitSha, githubTreeSha: newTree.sha };
}

function validateTree(tree: FileTree): void {
  const seen = new Set<string>();
  for (const file of tree.files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || typeof file.fileHash !== 'string') {
      throw new Error('DSG_FILE_TREE_FILE_INVALID');
    }
    const path = normalizePath(file.path);
    if (seen.has(path)) throw new Error('DSG_DUPLICATE_PATH_BLOCKED');
    seen.add(path);
    const expected = sha(`${path}\n${file.content}`);
    if (file.fileHash !== expected) throw new Error('DSG_FILE_HASH_MISMATCH_BLOCKED');
  }
}

function normalizePath(input: string): string {
  if (input.includes('..')) throw new Error('DSG_PATH_TRAVERSAL_BLOCKED');
  const p = input.replace(/^\/+/, '');
  const n = p.toLowerCase();
  if ((n === '.env' || n.endsWith('/.env')) && !n.endsWith('.env.example')) throw new Error('DSG_DOTENV_BLOCKED');
  return p;
}

const sha = (x: string) => createHash('sha256').update(x).digest('hex');

class GitHubApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

async function githubRequest<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new GitHubApiError(response.status, `DSG_GITHUB_API_ERROR_${response.status}:${text}`);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
