import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

test('MCP server starts and lists exactly the 8 Trinity tools', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/index.js'],
    cwd: projectRoot,
    stderr: 'pipe',
  });

  const client = new Client(
    { name: 'trinity-mcp-smoke-test', version: '1.0.0' },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name).sort();

    assert.deepEqual(names, [
      'trinity_chat_agent',
      'trinity_execute_task',
      'trinity_get_agents',
      'trinity_get_audit_logs',
      'trinity_get_costs',
      'trinity_get_state',
      'trinity_health_check',
      'trinity_set_agent_mode',
    ]);
  } finally {
    await client.close();
  }
});
