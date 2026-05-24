import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildWorkspaceManifest } from '../workspace.js';
import { sha256 } from '../policy.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsg-workspace-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('buildWorkspaceManifest', () => {
  it('returns root as a resolved absolute path', async () => {
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    expect(manifest.root).toBe(path.resolve(tmpDir));
  });

  it('generatedAt is an ISO 8601 timestamp', async () => {
    const before = Date.now();
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    const after = Date.now();
    const ts = new Date(manifest.generatedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('fileCount matches files.length', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.ts'), 'export {}');
    await fs.writeFile(path.join(tmpDir, 'b.ts'), 'export {}');
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    expect(manifest.fileCount).toBe(manifest.files.length);
  });

  it('files are sorted lexicographically by path', async () => {
    await fs.writeFile(path.join(tmpDir, 'z.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'a.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'm.ts'), '');
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    const paths = manifest.files.map((f) => f.path);
    expect(paths).toEqual([...paths].sort());
  });

  it('includeHashes=false produces no sha256 fields', async () => {
    await fs.writeFile(path.join(tmpDir, 'file.ts'), 'content');
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    for (const file of manifest.files) {
      expect(file.sha256).toBeUndefined();
    }
  });

  it('includeHashes=true adds sha256 fields for small files', async () => {
    const content = 'hello world';
    await fs.writeFile(path.join(tmpDir, 'file.ts'), content);
    const manifest = await buildWorkspaceManifest(tmpDir, true);
    expect(manifest.files.length).toBe(1);
    expect(manifest.files[0].sha256).toBe(sha256(Buffer.from(content)));
  });

  it('files larger than 512 KB are listed but have no sha256', async () => {
    const bigContent = Buffer.alloc(513 * 1024, 'x');
    await fs.writeFile(path.join(tmpDir, 'big.bin'), bigContent);
    const manifest = await buildWorkspaceManifest(tmpDir, true);
    const bigFile = manifest.files.find((f) => f.path === 'big.bin');
    expect(bigFile).toBeDefined();
    expect(bigFile!.sha256).toBeUndefined();
  });

  it('reports correct size in bytes', async () => {
    const content = 'abc';
    await fs.writeFile(path.join(tmpDir, 'f.txt'), content);
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    expect(manifest.files[0].size).toBe(Buffer.byteLength(content));
  });

  it('walks subdirectories recursively with relative paths', async () => {
    await fs.mkdir(path.join(tmpDir, 'sub'));
    await fs.writeFile(path.join(tmpDir, 'sub', 'nested.ts'), '');
    await fs.writeFile(path.join(tmpDir, 'top.ts'), '');
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    const paths = manifest.files.map((f) => f.path);
    expect(paths).toContain('top.ts');
    expect(paths).toContain(path.join('sub', 'nested.ts'));
  });

  it('caps output at 200 files', async () => {
    for (let i = 0; i < 205; i++) {
      await fs.writeFile(path.join(tmpDir, `file${i}.txt`), 'x');
    }
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    expect(manifest.fileCount).toBe(200);
    expect(manifest.files.length).toBe(200);
  });

  it.each(['.git', 'node_modules', 'dist', 'build', 'coverage', 'evidence', '.next'])(
    'excludes %s directory',
    async (excluded) => {
      await fs.mkdir(path.join(tmpDir, excluded));
      await fs.writeFile(path.join(tmpDir, excluded, 'secret.ts'), 'secret');
      await fs.writeFile(path.join(tmpDir, 'normal.ts'), 'ok');
      const manifest = await buildWorkspaceManifest(tmpDir, false);
      const paths = manifest.files.map((f) => f.path);
      expect(paths).not.toContain(path.join(excluded, 'secret.ts'));
      expect(paths).toContain('normal.ts');
    },
  );

  it('returns empty manifest for an empty directory', async () => {
    const manifest = await buildWorkspaceManifest(tmpDir, false);
    expect(manifest.fileCount).toBe(0);
    expect(manifest.files).toEqual([]);
  });
});
