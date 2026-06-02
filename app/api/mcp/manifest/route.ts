/**
 * GET /api/mcp/manifest
 *
 * Claude Desktop / Cursor / Windsurf compatible MCP tool manifest v2.
 * Exposes governance, code execution, web/browser, and Android device tools.
 *
 * Add to claude_desktop_config.json:
 *   "dsg-one": { "command": "npx", "args": ["-y", "@dsg/mcp-server"] }
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    name: 'dsg-one',
    version: '2.0.0',
    description: 'DSG ONE — governed AI execution control plane. Every action gated, logged, and auditable.',
    tools: [
      // ── Governance ──────────────────────────────────────────────────────────
      {
        name: 'execute_governed',
        description: 'Execute an AI action through the DSG ONE governance gate. Checks policy, rate limits, human approval, and produces a cryptographic audit envelope before allowing execution.',
        inputSchema: {
          type: 'object',
          properties: {
            tool: { type: 'string', description: 'Tool name (e.g. device.open_url)' },
            args: { type: 'object', description: 'Tool arguments' },
            human_approval_token: { type: 'string', description: 'Required for high-risk actions' },
          },
          required: ['tool'],
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get live CCVS compliance status — mutation score, claim gates, evidence chain.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Optional CI run ID' },
          },
        },
      },
      {
        name: 'get_delivery_proof',
        description: 'Run a live Delivery Proof scan against a production URL.',
        inputSchema: {
          type: 'object',
          properties: {
            production_url: { type: 'string', description: 'Production URL to scan' },
            repo_url: { type: 'string', description: 'GitHub repo URL (optional)' },
            readiness_path: { type: 'string', description: 'Readiness path (default: /api/readiness)' },
          },
          required: ['production_url'],
        },
      },

      // ── Code execution ───────────────────────────────────────────────────────
      {
        name: 'write_code_file',
        description: 'Write a code file into the governed sandbox (/tmp/dsg-code/). Secret injection blocked. Use before run_code.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Filename (e.g. script.py, index.js)' },
            content: { type: 'string', description: 'File content' },
            language: { type: 'string', enum: ['node', 'python3', 'bash'], description: 'Runtime hint' },
          },
          required: ['filename', 'content'],
        },
      },
      {
        name: 'run_code',
        description: 'Execute code in the sandbox. Supports node, python3, bash. 15s timeout. Returns stdout/stderr.',
        inputSchema: {
          type: 'object',
          properties: {
            runtime: { type: 'string', enum: ['node', 'python3', 'bash'], description: 'Runtime to use' },
            code: { type: 'string', description: 'Inline code snippet' },
            file: { type: 'string', description: 'Sandbox filename to run (from write_code_file)' },
          },
          required: ['runtime'],
        },
      },

      // ── Web / browser ────────────────────────────────────────────────────────
      {
        name: 'fetch_url',
        description: 'Fetch a public HTTPS URL and return text content. No JavaScript rendering. Fast and lightweight.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS URL to fetch' },
            selector: { type: 'string', description: 'Optional keyword to search in response' },
          },
          required: ['url'],
        },
      },
      {
        name: 'browser_navigate',
        description: 'Open a URL in a cloud browser (Browserbase) with full JS rendering. Requires BROWSERBASE_API_KEY.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'DSG agent ID for governance tracking' },
            url: { type: 'string', description: 'URL to open' },
            extract: { type: 'string', description: 'Extraction instruction or CSS selector' },
          },
          required: ['agent_id', 'url'],
        },
      },

      // ── Android device ───────────────────────────────────────────────────────
      {
        name: 'device_open_url',
        description: 'Open a URL on a connected Android device. Requires Android agent running on device.',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: { type: 'string', description: 'Android device ID' },
            url: { type: 'string', description: 'URL to open' },
          },
          required: ['deviceId', 'url'],
        },
      },
      {
        name: 'device_open_app',
        description: 'Open an app on a connected Android device.',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: { type: 'string', description: 'Android device ID' },
            packageName: { type: 'string', description: 'App package name (e.g. com.example.app)' },
          },
          required: ['deviceId', 'packageName'],
        },
      },
    ],
  });
}
