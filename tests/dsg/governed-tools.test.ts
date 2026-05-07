import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { executeGovernedToolRequest, prepareGovernedToolRequest } from '../../lib/dsg/tools/governed-tools';

describe('DSG governed tooling layer', () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
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

  it('marks browser operations as external data requiring confirmation', () => {
    const prepared = prepareGovernedToolRequest({ tool: 'browser', action: 'navigate', goal: 'Read docs', args: { url: 'https://example.com' } });
    expect(prepared.ok).toBe(false);
    expect(prepared.audit.truth).toBe('external_data_pending_verification');
    expect(prepared.blockedReasons).toContain('BROWSER_CONFIRMATION_REQUIRED');
  });
});
