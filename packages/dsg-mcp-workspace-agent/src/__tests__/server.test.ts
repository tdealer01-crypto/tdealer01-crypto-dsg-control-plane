/**
 * MCP server integration tests.
 * Uses InMemoryTransport to connect a real Client to the registered server tools
 * without going through stdio.
 *
 * NOTE: The server module is a singleton. All tests share the same connected
 * server instance. For parallel-safe isolation, server.ts would need to export
 * a factory function instead of a singleton — a recommended future refactor.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server } from '../server.js';

let client: Client;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsg-server-test-'));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
  delete process.env.DSG_WORKSPACE_ROOT;
  delete process.env.DSG_BROWSER_ALLOWED_ORIGINS;
  delete process.env.DSG_APPROVAL_TOKEN;
});

afterEach(() => {
  delete process.env.DSG_WORKSPACE_ROOT;
  delete process.env.DSG_BROWSER_ALLOWED_ORIGINS;
  delete process.env.DSG_APPROVAL_TOKEN;
});

// ---------------------------------------------------------------------------
// dsg.workspace_manifest
// ---------------------------------------------------------------------------
describe('dsg.workspace_manifest tool', () => {
  it('returns a PASS gate result and a manifest for a valid workspace root', async () => {
    await fs.writeFile(path.join(tmpDir, 'sample.ts'), 'export {}');
    process.env.DSG_WORKSPACE_ROOT = tmpDir;

    const result = await client.callTool({ name: 'dsg.workspace_manifest', arguments: { includeHashes: false } });
    expect(result.isError).toBeFalsy();

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('PASS');
    expect(parsed.manifest.root).toBe(path.resolve(tmpDir));
    expect(parsed.manifest.files.length).toBeGreaterThan(0);
  });

  it('includes file hashes when includeHashes=true', async () => {
    await fs.writeFile(path.join(tmpDir, 'hashed.ts'), 'hello');
    process.env.DSG_WORKSPACE_ROOT = tmpDir;

    const result = await client.callTool({ name: 'dsg.workspace_manifest', arguments: { includeHashes: true } });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    const hashedFile = parsed.manifest.files.find((f: { path: string }) => f.path === 'hashed.ts');
    expect(hashedFile?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// dsg.browser_plan
// ---------------------------------------------------------------------------
describe('dsg.browser_plan tool', () => {
  it('returns BLOCKED_WITH_EVIDENCE for an origin not in allowlist', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://allowed.example.com';

    const result = await client.callTool({
      name: 'dsg.browser_plan',
      arguments: { url: 'https://evil.com', objective: 'inspect evil site', actionType: 'inspect' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('BLOCKED_WITH_EVIDENCE');
  });

  it('returns PASS for an allowed origin with low-risk inspect action', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://example.com';

    const result = await client.callTool({
      name: 'dsg.browser_plan',
      arguments: { url: 'https://example.com/page', objective: 'inspect page', actionType: 'inspect' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('PASS');
    expect(parsed.gate.risk).toBe('low');
  });

  it('returns BLOCKED for medium-risk action with no approval token', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://example.com';
    delete process.env.DSG_APPROVAL_TOKEN;

    const result = await client.callTool({
      name: 'dsg.browser_plan',
      arguments: { url: 'https://example.com', objective: 'click something', actionType: 'click' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('BLOCKED_WITH_EVIDENCE');
    expect(parsed.gate.risk).toBe('medium');
  });

  it('returns PASS for medium-risk action with correct approval token', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://example.com';
    process.env.DSG_APPROVAL_TOKEN = 'my-secret';

    const result = await client.callTool({
      name: 'dsg.browser_plan',
      arguments: {
        url: 'https://example.com',
        objective: 'click button',
        actionType: 'click',
        approvalToken: 'my-secret',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------
// dsg.browser_snapshot
// ---------------------------------------------------------------------------
describe('dsg.browser_snapshot tool', () => {
  it('returns isError=true and BLOCKED gate for a disallowed origin (no browser launched)', async () => {
    process.env.DSG_BROWSER_ALLOWED_ORIGINS = 'https://allowed.example.com';

    const result = await client.callTool({
      name: 'dsg.browser_snapshot',
      arguments: { url: 'https://evil.com' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gate.status).toBe('BLOCKED_WITH_EVIDENCE');
  });
});

// ---------------------------------------------------------------------------
// dsg_browser_agent_operator prompt
// ---------------------------------------------------------------------------
describe('dsg_browser_agent_operator prompt', () => {
  it('returns a user message containing the task and DSG skill text', async () => {
    const result = await client.getPrompt({
      name: 'dsg_browser_agent_operator',
      arguments: { task: 'inspect the homepage' },
    });

    expect(result.messages).toHaveLength(1);
    const message = result.messages[0];
    expect(message.role).toBe('user');
    const content = message.content as { type: string; text: string };
    expect(content.type).toBe('text');
    expect(content.text).toContain('inspect the homepage');
    expect(content.text).toContain('PASS or BLOCKED_WITH_EVIDENCE');
  });
});
