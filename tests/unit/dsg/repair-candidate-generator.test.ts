import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  generateRepairCandidates,
  validateGeneratedCandidates,
  type RepairFinding,
} from '../../../lib/dsg/verified-repair';

const HASH = `sha256:${'a'.repeat(64)}`;
const ORIGINAL_ENV = { ...process.env };
const tempDirs: string[] = [];

const finding: RepairFinding = {
  id: 'finding-1',
  summary: 'return value should be two',
  severity: 'MEDIUM',
  executionRisk: 'LOW',
  affectedFiles: ['src/example.ts'],
  evidence: [{ id: 'scan-1', type: 'scan_output', contentHash: HASH }],
  reported: true,
};

function payload(expected = 'return 1;', replacement = 'return 2;') {
  return {
    candidates: [{
      id: 'candidate-a',
      changeGroup: 'fix-return',
      file: 'src/example.ts',
      expected,
      replacement,
      rationale: 'Fix the observed return value.',
      score: 90,
      conflictsWith: [],
      requires: [],
      touchesSensitive: false,
    }],
  };
}

async function createRepo(content = 'export function value() {\n  return 1;\n}\n') {
  const root = await mkdtemp(path.join(tmpdir(), 'dsg-candidate-generator-'));
  tempDirs.push(root);
  await writeFile(path.join(root, 'placeholder'), '', 'utf8');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(path.join(root, 'src'), { recursive: true }));
  await writeFile(path.join(root, 'src/example.ts'), content, 'utf8');
  return root;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, ORIGINAL_ENV);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('repair candidate generation validation', () => {
  it('accepts an exact unique in-scope candidate and normalizes its id', () => {
    const candidates = validateGeneratedCandidates({
      payload: payload(),
      finding,
      allowedFiles: ['src/example.ts'],
      snapshots: [{ file: 'src/example.ts', content: 'export function value() {\n  return 1;\n}\n' }],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('ai-001');
    expect(candidates[0].file).toBe('src/example.ts');
    expect(candidates[0].expected).toBe('return 1;');
    expect(candidates[0].replacement).toBe('return 2;');
  });

  it('blocks model output whose expected text is not unique in the real snapshot', () => {
    expect(() => validateGeneratedCandidates({
      payload: payload('return 1;', 'return 2;'),
      finding,
      allowedFiles: ['src/example.ts'],
      snapshots: [{ file: 'src/example.ts', content: 'return 1;\nreturn 1;\n' }],
    })).toThrow('GENERATED_EXPECTED_NOT_UNIQUE:candidate-a');
  });

  it('blocks model output outside the user-approved file scope', () => {
    const outside = payload();
    outside.candidates[0].file = 'src/other.ts';
    expect(() => validateGeneratedCandidates({
      payload: outside,
      finding,
      allowedFiles: ['src/example.ts'],
      snapshots: [{ file: 'src/example.ts', content: 'return 1;\n' }],
    })).toThrow('GENERATED_FILE_OUTSIDE_SCOPE:candidate-a:src/other.ts');
  });
});

describe('repair candidate provider adapters', () => {
  it('uses OpenAI structured output with storage disabled before validating candidates', async () => {
    const repoRoot = await createRepo();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_API_BASE = 'https://api.openai.com/v1';
    process.env.OPENAI_REPAIR_MODEL = 'test-codex-model';
    delete process.env.ANTHROPIC_API_KEY;

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.store).toBe(false);
      expect(body.text?.format?.type).toBe('json_schema');
      expect(body.text?.format?.name).toBe('dsg_repair_candidates');
      return new Response(JSON.stringify({
        id: 'resp_test_1',
        output_text: JSON.stringify(payload()),
        usage: { input_tokens: 10, output_tokens: 10 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateRepairCandidates({
      jobId: 'job-openai',
      finding,
      allowedFiles: ['src/example.ts'],
      repoRoot,
      provider: 'codex',
    });

    expect(result.evidence.provider).toBe('openai');
    expect(result.evidence.model).toBe('test-codex-model');
    expect(result.evidence.responseId).toBe('resp_test_1');
    expect(result.candidates[0].id).toBe('ai-001');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses a forced Claude tool schema and validates the returned tool input', async () => {
    const repoRoot = await createRepo();
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.ANTHROPIC_REPAIR_MODEL = 'test-claude-model';

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.tool_choice).toEqual({ type: 'tool', name: 'submit_repair_candidates' });
      expect(body.tools?.[0]?.input_schema?.properties?.candidates).toBeTruthy();
      return new Response(JSON.stringify({
        id: 'msg_test_1',
        model: 'test-claude-model',
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 10 },
        content: [{
          type: 'tool_use',
          id: 'toolu_1',
          name: 'submit_repair_candidates',
          input: payload(),
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateRepairCandidates({
      jobId: 'job-claude',
      finding,
      allowedFiles: ['src/example.ts'],
      repoRoot,
      provider: 'claude',
    });

    expect(result.evidence.provider).toBe('anthropic');
    expect(result.evidence.model).toBe('test-claude-model');
    expect(result.evidence.responseId).toBe('msg_test_1');
    expect(result.candidates[0].replacement).toBe('return 2;');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
