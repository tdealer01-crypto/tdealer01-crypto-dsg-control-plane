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
    expect(prepared.status).toBe('review');
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


  it('supports full schedule CRUD with verified append-only state transitions', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const created = await executeGovernedToolRequest({
      tool: 'schedule',
      action: 'create',
      goal: 'Create governed reminder schedule',
      sandboxRoot: tempRoot,
      args: { id: 'schedule:daily-proof', title: 'Daily proof', cron: '0 9 * * *' },
    });
    const readCreated = await executeGovernedToolRequest({ tool: 'schedule', action: 'read', goal: 'Read governed schedule', sandboxRoot: tempRoot, args: { id: 'schedule:daily-proof' } });
    const updated = await executeGovernedToolRequest({
      tool: 'schedule',
      action: 'update',
      goal: 'Update governed reminder schedule',
      sandboxRoot: tempRoot,
      args: { id: 'schedule:daily-proof', intervalMs: 120_000, enabled: true },
    });
    const deleted = await executeGovernedToolRequest({ tool: 'schedule', action: 'delete', goal: 'Delete governed schedule', sandboxRoot: tempRoot, args: { id: 'schedule:daily-proof', reason: 'No longer needed' } });

    expect(created.ok).toBe(true);
    expect(readCreated.ok).toBe(true);
    expect(updated.ok).toBe(true);
    expect(deleted.ok).toBe(true);
    expect((updated.output as { record: { state: { scheduler: { kind: string } } } }).record.state.scheduler.kind).toBe('interval');
    expect((updated.output as { adapterDecisionTrace: { step: string }[] }).adapterDecisionTrace.map((step) => step.step)).toEqual(
      expect.arrayContaining(['scheduler_apply', 'verify_runtime_side_effect', 'persist_append_only_record']),
    );
    expect((updated.output as { runtimeState: { kind: string } }).runtimeState.kind).toBe('interval');
    expect((deleted.output as { record: { status: string; state: { lifecycle: string } } }).record.status).toBe('deleted');
    expect((deleted.output as { record: { status: string; state: { lifecycle: string } } }).record.state.lifecycle).toBe('deleted');
    const schedulerAfterDelete = JSON.parse(await readFile(path.join(tempRoot, '.dsg-governed-tools', 'scheduler-runtime.json'), 'utf8'));
    expect(schedulerAfterDelete.entries['schedule:daily-proof']).toBeUndefined();
  });

  it('supports persistent compute allocate, read, and deallocate lifecycles', async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'dsg-tool-'));
    const allocated = await executeGovernedToolRequest({
      tool: 'persistent_compute',
      action: 'allocate',
      goal: 'Allocate sandbox worker',
      sandboxRoot: tempRoot,
      args: { id: 'compute:worker-a', name: 'worker-a', ttlMs: 600_000, resourceClass: 'sandbox-worker' },
    });
    const readAllocated = await executeGovernedToolRequest({ tool: 'persistent_compute', action: 'read', goal: 'Read sandbox worker', sandboxRoot: tempRoot, args: { id: 'compute:worker-a' } });
    const deallocated = await executeGovernedToolRequest({ tool: 'persistent_compute', action: 'deallocate', goal: 'Deallocate sandbox worker', sandboxRoot: tempRoot, args: { id: 'compute:worker-a', reason: 'Task complete' } });

    expect(allocated.ok).toBe(true);
    expect(readAllocated.ok).toBe(true);
    expect(deallocated.ok).toBe(true);
    expect((allocated.output as { record: { state: { computeHandle: string } } }).record.state.computeHandle).toMatch(/^pc:/);
    expect((allocated.output as { adapterDecisionTrace: { step: string }[] }).adapterDecisionTrace.map((step) => step.step)).toEqual(
      expect.arrayContaining(['provisioner_apply', 'verify_runtime_side_effect', 'persist_append_only_record']),
    );
    expect((allocated.output as { runtimeState: { lifecycle: string } }).runtimeState.lifecycle).toBe('allocated');
    expect((deallocated.output as { record: { status: string; state: { lifecycle: string } } }).record.status).toBe('deallocated');
    expect((deallocated.output as { record: { status: string; state: { lifecycle: string } } }).record.state.lifecycle).toBe('deallocated');
    const computeAfterDeallocate = JSON.parse(await readFile(path.join(tempRoot, '.dsg-governed-tools', 'compute-runtime.json'), 'utf8'));
    expect(computeAfterDeallocate.entries['compute:worker-a'].lifecycle).toBe('deallocated');
  });

  it('records search adapter step tracing and fails closed on empty verified results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200, headers: { 'content-type': 'text/plain' } })));

    const result = await executeGovernedToolRequest({
      tool: 'search',
      action: 'query',
      goal: 'Search governed docs',
      args: { query: 'awakening frame', endpoint: 'https://search.example.com/query', allowedHosts: ['search.example.com'], approved: true },
    });

    expect(result.ok).toBe(false);
    expect(result.executionDecisionFrame?.blockedReasons).toContain('SEARCH_EMPTY_RESULTS');
  });

  it('records API adapter traces for allowlisted HTTPS requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await executeGovernedToolRequest({
      tool: 'api',
      action: 'query',
      goal: 'Query governed API',
      args: { url: 'https://api.example.com/status', method: 'GET', allowedHosts: ['api.example.com'], approved: true },
    });

    expect(result.ok).toBe(true);
    expect((result.output as { adapterDecisionTrace: { step: string }[] }).adapterDecisionTrace.map((step) => step.step)).toEqual(
      expect.arrayContaining(['before_request', 'after_response', 'verify_response_body']),
    );
  });

  it('fails closed for google workspace adapter HTTP errors with execution decision frame evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'denied' }), { status: 403, headers: { 'content-type': 'application/json' } })));

    const result = await executeGovernedToolRequest({
      tool: 'google_workspace',
      action: 'query',
      goal: 'Search governed workspace docs',
      args: { operation: 'drive.search', endpoint: 'https://workspace.example.com/adapter', allowedHosts: ['workspace.example.com'], approved: true },
    });

    expect(result.ok).toBe(false);
    expect(result.outputVerification).toBe('blocked_before_execution');
    expect(result.executionDecisionFrame?.blockedReasons).toContain('GOOGLE_WORKSPACE_HTTP_NOT_OK');
  });

  it('adds adapter-level decision traces and fails closed for unverified browser responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } })));

    const result = await executeGovernedToolRequest({ tool: 'browser', action: 'navigate', goal: 'Read missing docs', args: { url: 'https://example.com/missing', approved: true } });

    expect(result.ok).toBe(false);
    expect(result.outputVerification).toBe('blocked_before_execution');
    expect(result.executionDecisionFrame?.blockedReasons).toContain('BROWSER_HTTP_NOT_OK');
  });

});
