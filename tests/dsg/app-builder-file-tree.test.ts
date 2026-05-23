import { describe, expect, it } from 'vitest';
import { buildDeterministicFileTree } from '../../lib/dsg/app-builder/file-tree';

describe('file tree', () => {
  it('hash deterministic', () => {
    const a = buildDeterministicFileTree([{ path: 'a.txt', content: 'x' }]);
    const b = buildDeterministicFileTree([{ path: 'a.txt', content: 'x' }]);
    expect(a.treeHash).toBe(b.treeHash);
  });

  it('blocks traversal and env', () => {
    expect(() => buildDeterministicFileTree([{ path: '../x', content: '' }])).toThrow();
    expect(() => buildDeterministicFileTree([{ path: '.env', content: '' }])).toThrow();
    expect(() => buildDeterministicFileTree([{ path: '.env.example', content: '' }])).not.toThrow();
  });

  it('empty file list produces a stable non-empty treeHash', () => {
    const a = buildDeterministicFileTree([]);
    const b = buildDeterministicFileTree([]);
    expect(a.treeHash).toBeTruthy();
    expect(a.treeHash).toBe(b.treeHash);
  });

  it('two lists with the same files in different order produce the same hash', () => {
    const a = buildDeterministicFileTree([
      { path: 'z.ts', content: 'z' },
      { path: 'a.ts', content: 'a' },
    ]);
    const b = buildDeterministicFileTree([
      { path: 'a.ts', content: 'a' },
      { path: 'z.ts', content: 'z' },
    ]);
    expect(a.treeHash).toBe(b.treeHash);
  });

  it('handles files with special characters in name without throwing', () => {
    expect(() =>
      buildDeterministicFileTree([
        { path: 'foo bar.ts', content: 'hello' },
        { path: 'café.ts', content: 'world' },
      ])
    ).not.toThrow();
  });

  it('handles deeply nested paths', () => {
    expect(() =>
      buildDeterministicFileTree([{ path: 'a/b/c/d/file.ts', content: 'deep' }])
    ).not.toThrow();
    const result = buildDeterministicFileTree([{ path: 'a/b/c/d/file.ts', content: 'deep' }]);
    expect(result.files[0].path).toBe('a/b/c/d/file.ts');
  });
});
