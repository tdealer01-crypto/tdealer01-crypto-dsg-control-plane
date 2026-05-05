import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDeterministicFileTree } from '@/lib/dsg/app-builder/file-tree';
import { writeTreeToGithubBranch } from '@/lib/dsg/app-builder/github-writer';

describe('github writer', () => {
  const env = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...env };
    delete process.env.GITHUB_TOKEN;
    delete process.env.DSG_TARGET_REPO;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.DSG_GITHUB_BASE_REF;
  });

  it('blocks missing token', async () => {
    process.env.DSG_TARGET_REPO = 'acme/repo';
    const tree = buildDeterministicFileTree([{ path: 'a.txt', content: 'x' }]);
    await expect(writeTreeToGithubBranch('feature', tree)).rejects.toThrow('DSG_GITHUB_TOKEN_REQUIRED');
  });

  it('blocks missing repo', async () => {
    process.env.GITHUB_TOKEN = 'tok';
    const tree = buildDeterministicFileTree([{ path: 'a.txt', content: 'x' }]);
    await expect(writeTreeToGithubBranch('feature', tree)).rejects.toThrow('DSG_GITHUB_REPO_REQUIRED');
  });

  it('blocks empty tree', async () => {
    process.env.GITHUB_TOKEN = 'tok';
    process.env.DSG_TARGET_REPO = 'acme/repo';
    await expect(writeTreeToGithubBranch('feature', { files: [], treeHash: '' })).rejects.toThrow('DSG_FILE_TREE_REQUIRED');
  });

  it('blocks unsafe path', async () => {
    process.env.GITHUB_TOKEN = 'tok';
    process.env.DSG_TARGET_REPO = 'acme/repo';
    const tree = buildDeterministicFileTree([{ path: '.env.example', content: 'x' }]);
    tree.files[0].path = '../evil.txt';
    await expect(writeTreeToGithubBranch('feature', tree)).rejects.toThrow('DSG_PATH_TRAVERSAL_BLOCKED');
  });

  it('returns real github commit sha and deterministic call order', async () => {
    process.env.GITHUB_TOKEN = 'tok';
    process.env.DSG_TARGET_REPO = 'acme/repo';
    process.env.DSG_GITHUB_BASE_REF = 'main';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ object: { sha: 'base-ref-sha' } }))
      .mockResolvedValueOnce(okJson({ tree: { sha: 'base-tree-sha' } }))
      .mockResolvedValueOnce(okJson({ object: { sha: 'branch-head-sha' } }))
      .mockResolvedValueOnce(okJson({ sha: 'blob-sha-1' }))
      .mockResolvedValueOnce(okJson({ sha: 'new-tree-sha' }))
      .mockResolvedValueOnce(okJson({ sha: 'real-commit-sha-123' }))
      .mockResolvedValueOnce(okNoContent());

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const tree = buildDeterministicFileTree([{ path: 'a.txt', content: 'hello' }]);
    const result = await writeTreeToGithubBranch('feature-dsg', tree);

    expect(result.commitSha).toBe('real-commit-sha-123');
    expect(result.commitSha.startsWith('sim_')).toBe(false);

    const urls = fetchMock.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls).toEqual([
      'https://api.github.com/repos/acme/repo/git/ref/heads/main',
      'https://api.github.com/repos/acme/repo/git/commits/base-ref-sha',
      'https://api.github.com/repos/acme/repo/git/ref/heads/feature-dsg',
      'https://api.github.com/repos/acme/repo/git/blobs',
      'https://api.github.com/repos/acme/repo/git/trees',
      'https://api.github.com/repos/acme/repo/git/commits',
      'https://api.github.com/repos/acme/repo/git/refs/heads/feature-dsg',
    ]);
  });
});

function okJson(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function okNoContent(): Response {
  return {
    ok: true,
    status: 204,
    json: async () => ({}),
    text: async () => '',
  } as Response;
}
