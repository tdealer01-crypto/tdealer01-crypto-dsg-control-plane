#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const ACTIVE_ROOTS = [
  '.github/workflows',
  'app',
  'components',
  'lib',
  'scripts',
  'dsg-one-mcp-server',
  'packages',
  'z3-solver-api',
];

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sh', '.yml', '.yaml', '.json',
]);

const EXCLUDED = new Set([
  'scripts/verify-azure-only-active-paths.mjs',
]);

const FORBIDDEN = [
  { label: 'retired Vercel production hostname', regex: /\.vercel\.app\b/i },
  { label: 'retired Vercel API', regex: /api\.vercel\.com\b/i },
  { label: 'retired Vercel runtime environment variable', regex: /process\.env\.VERCEL_[A-Z0-9_]+/ },
  { label: 'retired Vercel GitHub Actions secret/variable', regex: /\$\{\{\s*(?:secrets|vars)\.VERCEL_[A-Z0-9_]+/ },
  { label: 'retired Vercel CLI command', regex: /(?:^|[\s;&|])(?:npx\s+|npm\s+exec\s+)?vercel(?:\s+|$)/im },
  { label: 'retired Vercel env command', regex: /\bvercel\s+env\b/i },
];

function walk(path) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'build') continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

const files = ACTIVE_ROOTS.flatMap((root) => walk(join(ROOT, root)));
const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  if (EXCLUDED.has(rel)) continue;
  if (!statSync(file).isFile()) continue;

  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of FORBIDDEN) {
      if (rule.regex.test(line)) {
        violations.push({ file: rel, line: index + 1, label: rule.label, text: line.trim().slice(0, 240) });
      }
      rule.regex.lastIndex = 0;
    }
  }
}

if (violations.length > 0) {
  console.error('AZURE_ONLY_ACTIVE_PATHS=FAIL');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.label}: ${violation.text}`);
  }
  process.exit(1);
}

console.log(`AZURE_ONLY_ACTIVE_PATHS=PASS scanned=${files.length}`);
