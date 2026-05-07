import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeGovernedToolRequest, prepareGovernedToolRequest } from '../../lib/dsg/tools/governed-tools';

describe('DSG governed tooling layer', () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  });

  it('fails closed for destructive shell commands before execution', () => {
    const prepared = prepareGovernedToolRequest({ tool: 'shell', action: 'exec', goal: 'Inspect working directory', args: { command: 'rm -rf .' } });
    expect(prepared.ok).toBe(false);
    expect(prepared.status).toBe('blocked');
    expect(prepared.blockedReasons).toContain('SHELL_COMMAND_NOT_ALLOWLISTED');
    expect(prepared.audit.truth).toBe('runtime_evidence');
  });

  it('executes only allowlisted shell commands as runtime evidence', async () => {
    const result = await executeGovernedToolRequest({ tool: 'shell', action: 'exec', goal: 'Show node version', args: { command: 'node --version' } });
    expect(result.ok).toBe(true);
    expect(result.outputVerification).toBe('runtime_evidence');
    expect(String((result.output as { stdout: string }).stdout)).toMatch(/^v\d+/);
  });

  it('keeps file operations inside the sandbox and writes audit-hashed evidence', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const result = await executeGovernedToolRequest({
      tool: 'file',
      action: 'write',
      goal: 'Create sandbox note',
      sandboxRoot: tempRoot,
      args: { path: 'notes/proof.txt', content: 'verified runtime note' },
    });
    expect(result.ok).toBe(true);
    expect(result.outputVerification).toBe('runtime_evidence');
    await expect(readFile(path.join(tempRoot, 'notes/proof.txt'), 'utf8')).resolves.toBe('verified runtime note');
  });

  it('blocks file traversal outside the sandbox', () => {
    const prepared = prepareGovernedToolRequest({ tool: 'file', action: 'read', goal: 'Read outside file', sandboxRoot: '/tmp/dsg', args: { path: '../secret.txt' } });
    expect(prepared.ok).toBe(false);
    expect(prepared.blockedReasons).toContain('PATH_OUTSIDE_SANDBOX');
  });

  it('keeps browser operations blocked until explicit approval is supplied', () => {
    const prepared = prepareGovernedToolRequest({ tool: 'browser', action: 'navigate', goal: 'Read docs', args: { url: 'https://example.com' } });
    expect(prepared.ok).toBe(false);
    expect(prepared.audit.truth).toBe('external_data_pending_verification');
    expect(prepared.blockedReasons).toContain('BROWSER_CONFIRMATION_REQUIRED');
  });

  it('executes approved browser navigation and returns hashed runtime evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><head><title>Docs</title></head><body><main>Governed adapter evidence</main></body></html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    );

    const result = await executeGovernedToolRequest({ tool: 'browser', action: 'navigate', goal: 'Read docs', args: { url: 'https://example.com/docs', approved: true } });

    expect(result.ok).toBe(true);
    expect(result.outputVerification).toBe('runtime_evidence');
    expect(result.prepared.status).toBe('ready');
    expect(result.output).toMatchObject({ status: 200, ok: true, title: 'Docs' });
    expect((result.output as { text: string }).text).toContain('Governed adapter evidence');
  });

  it('persists governed plans as append-only evidence records inside the sandbox', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const result = await executeGovernedToolRequest({
      tool: 'plan',
      action: 'create',
      goal: 'Create implementation plan',
      sandboxRoot: tempRoot,
      args: { title: 'Adapter rollout', steps: ['verify', 'execute', 'persist'] },
    });

    expect(result.ok).toBe(true);
    expect(result.outputVerification).toBe('runtime_evidence');
    expect(result.prepared.audit.truth).toBe('internal_state_pending_verification');
    const persisted = await readFile(path.join(tempRoot, '.dsg-governed-tools', 'plan.jsonl'), 'utf8');
    expect(persisted).toContain('Adapter rollout');
    expect(persisted).toContain(result.prepared.audit.requestHash);
  });

  it('requires configured and approved endpoints for search execution', () => {
    const prepared = prepareGovernedToolRequest({ tool: 'search', action: 'query', goal: 'Search docs', args: { query: 'governed tools' } });
    expect(prepared.ok).toBe(false);
    expect(prepared.blockedReasons).toContain('SEARCH_ENDPOINT_URL_REQUIRED');
    expect(prepared.blockedReasons).toContain('SEARCH_CONFIRMATION_REQUIRED');
  });

  it('executes approved API requests only against HTTPS allowlisted hosts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ saved: true }), { status: 201, headers: { 'content-type': 'application/json' } })));

    const result = await executeGovernedToolRequest({
      tool: 'api',
      action: 'create',
      goal: 'Create external ticket',
      args: { url: 'https://api.example.com/tickets', method: 'POST', body: { title: 'Need proof' }, allowedHosts: ['api.example.com'], approved: true },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ status: 201, ok: true, method: 'POST', body: { saved: true } });
  });

  it('blocks persistence updates when the append-only record does not exist', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const result = await executeGovernedToolRequest({
      tool: 'workflow',
      action: 'update',
      goal: 'Update missing workflow',
      sandboxRoot: tempRoot,
      args: { id: 'workflow:missing', status: 'done' },
    });

    expect(result.ok).toBe(false);
    expect(result.outputVerification).toBe('blocked_before_execution');
    expect(result.executionDecisionFrame?.blockedReasons).toContain('PERSISTENCE_RECORD_NOT_FOUND');
  });

  it('persists updates as linked revisions with materialized state', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const created = await executeGovernedToolRequest({
      tool: 'workflow',
      action: 'create',
      goal: 'Create workflow',
      sandboxRoot: tempRoot,
      args: { id: 'workflow:rollout', title: 'Rollout', steps: ['prepare'] },
    });
    const updated = await executeGovernedToolRequest({
      tool: 'workflow',
      action: 'update',
      goal: 'Update workflow',
      sandboxRoot: tempRoot,
      args: { id: 'workflow:rollout', status: 'done' },
    });

    expect(created.ok).toBe(true);
    expect(updated.ok).toBe(true);
    expect(updated.executionDecisionFrame?.ok).toBe(true);
    const persisted = (await readFile(path.join(tempRoot, '.dsg-governed-tools', 'workflow.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    expect(persisted).toHaveLength(2);
    expect(persisted[1].revision).toBe(2);
    expect(persisted[1].previousEventHash).toBe(persisted[0].eventHash);
    expect(persisted[1].state).toMatchObject({ title: 'Rollout', status: 'done' });
  });

});
