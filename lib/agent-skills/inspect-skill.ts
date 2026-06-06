import type { GitHubSkillSource, SkillInspection } from './types';

type GitHubContentsResponse = {
  content?: string;
  encoding?: string;
  type?: string;
};

type GitHubCodeSearchResponse = {
  total_count: number;
};

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function fetchRepoFile(owner: string, repo: string, path: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    { headers: githubHeaders(), cache: 'no-store' },
  );
  if (!res.ok) return null;

  const json = (await res.json()) as GitHubContentsResponse;
  if (json.encoding === 'base64' && json.content) {
    return Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  }
  return null;
}

async function hasTestFiles(owner: string, repo: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/search/code?q=test+extension:test.ts+extension:test.js+extension:spec.ts+repo:${owner}/${repo}&per_page=1`,
    { headers: githubHeaders(), cache: 'no-store' },
  );
  if (!res.ok) return false;
  const json = (await res.json()) as GitHubCodeSearchResponse;
  return json.total_count > 0;
}

const SECRET_PATTERNS = [
  /\bsk[-_][a-zA-Z0-9]{20,}/,
  /\bghp_[a-zA-Z0-9]{36}/,
  /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/i,
  /password\s*=\s*['"][^'"]{8,}['"]/i,
];

function detectHardcodedSecrets(content: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(content));
}

export async function inspectGitHubSkill(source: GitHubSkillSource): Promise<SkillInspection> {
  const { owner, repo } = source;

  const [readmeContent, licenseContent, packageJsonContent, hasTests, securityContent] =
    await Promise.all([
      fetchRepoFile(owner, repo, 'README.md'),
      fetchRepoFile(owner, repo, 'LICENSE').then((r) => r ?? fetchRepoFile(owner, repo, 'LICENSE.md')),
      fetchRepoFile(owner, repo, 'package.json'),
      hasTestFiles(owner, repo),
      fetchRepoFile(owner, repo, 'SECURITY.md'),
    ]);

  let rawPackageJson: Record<string, unknown> | null = null;
  let dependencies: string[] = [];
  if (packageJsonContent) {
    try {
      rawPackageJson = JSON.parse(packageJsonContent) as Record<string, unknown>;
      const deps = {
        ...(rawPackageJson['dependencies'] as Record<string, string> | undefined),
        ...(rawPackageJson['devDependencies'] as Record<string, string> | undefined),
      };
      dependencies = Object.keys(deps);
    } catch {
      // malformed package.json — ignore
    }
  }

  const allText = [readmeContent ?? '', packageJsonContent ?? ''].join('\n');
  const hasSecretHardcoded = detectHardcodedSecrets(allText);
  const hasExternalWrite =
    !!readmeContent &&
    /\b(write|deploy|push|insert|update|delete|mutate|POST|PUT|PATCH|DELETE)\b/i.test(readmeContent);
  const hasCodeExecution =
    !!readmeContent &&
    /\b(exec|spawn|shell|child_process|eval|run script|subprocess)\b/i.test(readmeContent);

  return {
    source,
    hasReadme: !!readmeContent,
    hasLicense: !!licenseContent,
    hasTests,
    hasSchemaOrTypes: dependencies.some((d) => ['zod', 'yup', 'joi'].includes(d)) || !!rawPackageJson?.['types'],
    hasSecretHardcoded,
    hasExternalWrite,
    hasCodeExecution,
    dependencies,
    securityPolicy: !!securityContent,
    rawReadme: readmeContent,
    rawPackageJson,
  };
}
