import type { GitHubSkillSource } from './types';

type GitHubSearchItem = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  license: { spdx_id: string } | null;
  topics: string[];
  updated_at: string;
};

type GitHubSearchResponse = {
  total_count: number;
  items: GitHubSearchItem[];
};

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function searchGitHubSkills(
  query: string,
  maxResults = 10,
): Promise<GitHubSkillSource[]> {
  const q = encodeURIComponent(`${query} skill agent in:name,description,readme`);
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=${maxResults}`,
    { headers: githubHeaders(), cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(`GITHUB_SEARCH_FAILED:${res.status}`);
  }

  const json = (await res.json()) as GitHubSearchResponse;
  return json.items.map((item) => ({
    owner: item.full_name.split('/')[0],
    repo: item.name,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description,
    stars: item.stargazers_count,
    license: item.license?.spdx_id ?? null,
    language: item.language,
    topics: item.topics ?? [],
    lastCommit: item.updated_at,
  }));
}

export async function fetchGitHubRepoMeta(
  owner: string,
  repo: string,
): Promise<GitHubSkillSource | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: githubHeaders(), cache: 'no-store' },
  );
  if (!res.ok) return null;
  const item = (await res.json()) as GitHubSearchItem & { default_branch?: string };
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    url: item.html_url,
    description: item.description,
    stars: item.stargazers_count,
    license: item.license?.spdx_id ?? null,
    language: item.language,
    topics: item.topics ?? [],
    lastCommit: item.updated_at,
  };
}
