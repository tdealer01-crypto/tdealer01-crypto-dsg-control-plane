import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  'app',
  'lib',
  'components',
  'skills',
  'packages',
  'dsg-one-mcp-server/src',
  'apps',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py']);
const SKIP_SEGMENTS = ['/tests/', '/test/', '/__tests__/', '/fixtures/', '/examples/'];
const SKIP_FILES = new Set([
  // Benchmark harnesses may exercise compatibility paths, but are not product runtime.
  'lib/dsg-one/ising-benchmark.ts',
]);

const RULES = [
  ['synthetic payment identifier', /\b(?:ch|po|re)_mock_[A-Za-z0-9_-]*/i],
  ['synthetic auth token', /\bmock_token\b/i],
  ['runtime mock provider', /provider\s*:\s*['"]mock['"]/i],
  ['runtime mock solver mode', /mode\s*:\s*['"](?:mock|live-fallback-mock)['"]/i],
  ['mock data object', /\bmockData\b/],
  ['mock data factory', /\bgetMock[A-Z][A-Za-z0-9_]*/],
  ['mock auth fallback', /\buseMockAuth\b/],
  ['automatic mock fallback option', /\bfallbackToMock\b/],
  ['synthetic in-memory success store', /\btestMemoryStore\b/],
];

function walk(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
    } else {
      output.push(fullPath);
    }
  }
  return output;
}

function normalized(file) {
  return file.split(path.sep).join('/');
}

const findings = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const filePath = normalized(file);
    if (!EXTENSIONS.has(path.extname(filePath))) continue;
    if (SKIP_FILES.has(filePath)) continue;
    if (SKIP_SEGMENTS.some((segment) => `/${filePath}`.includes(segment))) continue;
    if (/\.(?:test|spec)\.[^.]+$/i.test(filePath)) continue;

    const source = fs.readFileSync(file, 'utf8');
    for (const [name, rule] of RULES) {
      const match = source.match(rule);
      if (!match) continue;
      const before = source.slice(0, match.index ?? 0);
      const line = before.split('\n').length;
      findings.push({ filePath, line, name, match: match[0] });
    }
  }
}

if (findings.length > 0) {
  console.error('Production synthetic-data guard: BLOCK');
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} [${finding.name}] ${JSON.stringify(finding.match)}`);
  }
  process.exit(1);
}

console.log('Production synthetic-data guard: PASS');
console.log('No forbidden runtime mock/synthetic-success patterns found in product source roots.');
