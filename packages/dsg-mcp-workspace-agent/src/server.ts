#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { openBrowserSnapshot } from './browser.js';
import { buildWorkspaceManifest } from './workspace.js';
import { DSG_BROWSER_AGENT_SKILL } from './skill.js';
import {
  assertUrlAllowed,
  classifyBrowserAction,
  gate,
  parseAllowedOrigins,
  requireApprovalForRisk,
} from './policy.js';

const server = new McpServer({
  name: 'dsg-mcp-workspace-agent',
  version: '0.1.0',
});

server.registerResource(
  'dsg-browser-agent-skill',
  'dsg://skill/browser-agent',
  {
    title: 'DSG Browser Agent Skill',
    description: 'Governed skill card for read-only browser inspection with evidence.',
    mimeType: 'text/markdown',
  },
  async () => ({
    contents: [
      {
        uri: 'dsg://skill/browser-agent',
        mimeType: 'text/markdown',
        text: DSG_BROWSER_AGENT_SKILL,
      },
    ],
  }),
);

server.registerTool(
  'dsg.workspace_manifest',
  {
    title: 'DSG Workspace Manifest',
    description: 'Read the real workspace file manifest under DSG_WORKSPACE_ROOT. No writes, no shell execution.',
    inputSchema: {
      includeHashes: z.boolean().default(true).describe('Hash files up to 512 KB for evidence integrity.'),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  async ({ includeHashes }) => {
    const root = process.env.DSG_WORKSPACE_ROOT || process.cwd();
    const manifest = await buildWorkspaceManifest(root, includeHashes);
    const gateResult = gate({ root: manifest.root, includeHashes }, 'low', true, 'workspace read-only manifest allowed');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ gate: gateResult, manifest }, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  'dsg.browser_plan',
  {
    title: 'DSG Browser Action Plan',
    description: 'Validate URL, classify browser action risk, and return a gate decision before execution.',
    inputSchema: {
      url: z.string().url().describe('Target URL. Origin must be in DSG_BROWSER_ALLOWED_ORIGINS.'),
      objective: z.string().min(1).max(1000).describe('User-visible reason for browser access.'),
      actionType: z
        .enum(['inspect', 'navigate', 'snapshot', 'click', 'download', 'form_fill', 'submit'])
        .default('snapshot'),
      approvalToken: z.string().optional().describe('Required only for medium/high risk actions.'),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ url, objective, actionType, approvalToken }) => {
    const risk = classifyBrowserAction(actionType);
    try {
      const allowedUrl = assertUrlAllowed(url, parseAllowedOrigins(process.env.DSG_BROWSER_ALLOWED_ORIGINS));
      requireApprovalForRisk(risk, approvalToken);
      const gateResult = gate({ url: allowedUrl.toString(), objective, actionType }, risk, true, 'browser action plan allowed');
      return { content: [{ type: 'text', text: JSON.stringify({ gate: gateResult }, null, 2) }] };
    } catch (error) {
      const gateResult = gate({ url, objective, actionType }, risk, false, error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: JSON.stringify({ gate: gateResult }, null, 2) }], isError: true };
    }
  },
);

server.registerTool(
  'dsg.browser_snapshot',
  {
    title: 'DSG Browser Snapshot',
    description: 'Open an allowlisted URL in Chromium, capture a screenshot, and write evidence metadata. Read-only only.',
    inputSchema: {
      url: z.string().url().describe('Target URL. Origin must be in DSG_BROWSER_ALLOWED_ORIGINS.'),
      note: z.string().max(1000).optional().describe('Optional evidence note.'),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async ({ url, note }) => {
    try {
      const result = await openBrowserSnapshot({ url, note });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const gateResult = gate({ url, note }, 'low', false, error instanceof Error ? error.message : String(error));
      return { content: [{ type: 'text', text: JSON.stringify({ gate: gateResult }, null, 2) }], isError: true };
    }
  },
);

server.registerPrompt(
  'dsg_browser_agent_operator',
  {
    title: 'DSG Browser Agent Operator',
    description: 'Reusable prompt for operating the DSG MCP browser skill safely.',
    argsSchema: {
      task: z.string().min(1).max(2000).describe('The browser/workspace task to perform.'),
    },
  },
  async ({ task }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${DSG_BROWSER_AGENT_SKILL}\n\nTask:\n${task}\n\nReturn only evidence-backed status: PASS or BLOCKED_WITH_EVIDENCE.`,
        },
      },
    ],
  }),
);

export { server };

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
