import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mcpTool } from '../../../lib/dsg/pool-exact';

const created: string[] = [];
let seq = 0;

function pool(lines: string[]): string {
  const dir = path.join(process.cwd(), '.dsg');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `pool-exact-v10-${process.pid}-${seq++}.jsonl`);
  writeFileSync(file, lines.join('\n'), 'utf8');
  created.push(file);
  return path.relative(process.cwd(), file);
}

afterEach(() => {
  for (const file of created.splice(0)) rmSync(file, { force: true });
});

describe('dsg_pool_exact_select v10 regressions', () => {
  it('keeps positive 0.5 when minComposite is zero', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"positive","composite":0.5}',
        '{"id":"negative","composite":-0.5}',
      ]),
      k: 1,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.selected.map((x: any) => x.id)).toEqual(['positive']);
    expect(result.selected[0].composite_raw).toBe('0.5');
  });

  it.each(['abc', '.'])('fails closed for invalid minComposite %s', async (minComposite) => {
    const result = await mcpTool.handler({
      poolPath: '.dsg/not-read-for-invalid-threshold.jsonl',
      k: 1,
      minComposite,
      useZ3: false,
    });

    expect(result).toMatchObject({
      success: false,
      status: 'BLOCKED',
      reason: 'INVALID_MIN_COMPOSITE_FORMAT',
    });
  });

  it('compares huge exponent gaps exactly without exponent-sized padding', async () => {
    const nineTimesA = `9${'0'.repeat(10001)}e-20002`;
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"a","composite":1e-10001}',
        `{"id":"b","composite":${nineTimesA}}`,
      ]),
      k: 1,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('exact-sort');
    expect(result.selected.map((x: any) => x.id)).toEqual(['b']);
    expect(result.selected[0].composite_raw).toBe(nineTimesA);
  });

  it('binds escaped top-level composite keys using JSON key semantics and last-key-wins', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"a","composite":1,"\\u0063omposite":2}',
        '{"id":"b","composite":1.5}',
      ]),
      k: 1,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.selected.map((x: any) => x.id)).toEqual(['a']);
    expect(result.selected[0].composite_raw).toBe('2');
  });

  it('preserves exact precision beyond IEEE-754 sorting precision', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"lo","composite":0.50003}',
        '{"id":"hi","composite":0.50004}',
      ]),
      k: 1,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.selected.map((x: any) => x.id)).toEqual(['hi']);
  });

  it('keeps exponent parsing exact beyond Number.MAX_SAFE_INTEGER', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"a","composite":1e-9007199254740993}',
        '{"id":"b","composite":2e-9007199254740993}',
      ]),
      k: 1,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.selected.map((x: any) => x.id)).toEqual(['b']);
  });

  it('normalizes signed zero and applies deterministic id tie-break', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"b","composite":-0}',
        '{"id":"a","composite":0}',
      ]),
      k: 1,
      minComposite: '-1',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.selected.map((x: any) => x.id)).toEqual(['a']);
  });

  it('treats equivalent decimal spellings as equal and ties by id', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"c","composite":10e-1}',
        '{"id":"b","composite":1.0}',
        '{"id":"a","composite":1}',
      ]),
      k: 2,
      minComposite: '0',
      useZ3: false,
    });

    expect(result.success).toBe(true);
    expect(result.selected.map((x: any) => x.id)).toEqual(['a', 'b']);
  });

  it('executes the Z3 path and matches the deterministic exact top-k result', async () => {
    const lines = Array.from({ length: 13 }, (_, i) => {
      const score = (13 - i) / 100;
      return JSON.stringify({ id: `id-${String(i).padStart(2, '0')}`, composite: score });
    });
    const result = await mcpTool.handler({
      poolPath: pool(lines),
      k: 12,
      minComposite: '0',
      useZ3: true,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('verified-exact');
    expect(result.selectedCount).toBe(12);
    expect(result.selected.map((x: any) => x.id)).not.toContain('id-12');
    expect(result.verification).toContain('Z3 Real exact matched');
  }, 30_000);

  it('accepts scientific notation on the Z3 path without losing exactness', async () => {
    const result = await mcpTool.handler({
      poolPath: pool([
        '{"id":"a","composite":5e-1}',
        '{"id":"b","composite":0.49}',
      ]),
      k: 1,
      minComposite: '0',
      useZ3: true,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('verified-exact');
    expect(result.selected.map((x: any) => x.id)).toEqual(['a']);
  }, 30_000);
});
