import fs from 'node:fs';
import path from 'node:path';

const LIVE_ROOT = path.join(process.cwd(), 'app/finance-governance/live');
const SERVER_STORE_PATTERN = '/api/finance-governance/server-store/';

function collectTsxFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(target));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(target);
    }
  }

  return files;
}

describe('finance governance callers', () => {
  it('do not reference deprecated server-store API endpoints', () => {
    const files = collectTsxFiles(LIVE_ROOT);
    const offenders = files
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes(SERVER_STORE_PATTERN))
      .map((filePath) => path.relative(process.cwd(), filePath));

    expect(offenders).toEqual([]);
  });
});
