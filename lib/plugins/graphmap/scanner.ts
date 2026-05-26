import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';

export function matchGlob(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]]/g, '\\$&')
    .replace(/\*\*/g, '\x00') // temp placeholder for **
    .replace(/\*/g, '[^/]+')
    .replace(/\x00/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${regexStr}$`).test(normalized);
}

function isExcluded(relPath: string, exclude: string[]): boolean {
  return exclude.some(ex => matchGlob(ex, relPath));
}

function isIncluded(relPath: string, include: string[]): boolean {
  return include.some(inc => matchGlob(inc, relPath));
}

const DEFAULT_INCLUDE = [
  'app/**',
  'lib/**',
  'scripts/**',
  'supabase/**',
  'plugins/**',
  '*.md',
  '*.yaml',
  '*.json',
];

const DEFAULT_EXCLUDE = [
  'node_modules/**',
  '.next/**',
  'dist/**',
  'graphmap-out/**',
  '.git/**',
  '*.lock',
  'package-lock.json',
];

async function walk(dir: string, rootPath: string, include: string[], exclude: string[]): Promise<string[]> {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(rootPath, fullPath).replace(/\\/g, '/');

    if (isExcluded(relPath, exclude) || isExcluded(relPath + '/', exclude)) continue;

    let s;
    try {
      s = await stat(fullPath);
    } catch {
      continue;
    }

    if (s.isDirectory()) {
      results.push(...(await walk(fullPath, rootPath, include, exclude)));
    } else if (s.isFile() && isIncluded(relPath, include)) {
      results.push(relPath);
    }
  }
  return results;
}

export async function scanRepo(
  rootPath: string,
  include: string[] = DEFAULT_INCLUDE,
  exclude: string[] = DEFAULT_EXCLUDE,
): Promise<string[]> {
  return walk(rootPath, rootPath, include, exclude);
}

export async function readFileContent(rootPath: string, relPath: string): Promise<string> {
  try {
    return await readFile(join(rootPath, relPath), 'utf-8');
  } catch {
    return '';
  }
}

export { DEFAULT_INCLUDE, DEFAULT_EXCLUDE };
