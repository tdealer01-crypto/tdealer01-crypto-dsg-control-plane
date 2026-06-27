/**
 * GET /api/mcp/manifest
 *
 * Claude Desktop / Cursor compatible MCP tool manifest.
 * Lists the three core DSG ONE governance tools available via the MCP server.
 *
 * Add to claude_desktop_config.json:
 *   "dsg-one": { "command": "npx", "args": ["-y", "@dsg/mcp-server"] }
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    name: 'dsg-one',
    version: '1.1.0',
    description: 'DSG ONE governance-before-execution MCP server — every AI action verified before it runs.',
    tools: [
      {
        name: 'execute_governed',
        description: 'Execute an AI action through the DSG ONE governance gate. The gate checks policy, rate limits, human approval (if required), and produces a cryptographic audit envelope before allowing execution.',
        inputSchema: {
          type: 'object',
          properties: {
            tool: { type: 'string', description: 'Tool name to execute (e.g. device.open_url, file.preview)' },
            args: { type: 'object', description: 'Arguments for the tool' },
            human_approval_token: { type: 'string', description: 'Required for STABILIZE-class actions' },
          },
          required: ['tool'],
        },
      },
      {
        name: 'get_compliance_status',
        description: 'Get the live CCVS compliance status including claim_pass_eligible flag, mutation score, and shields.io badge data. Reads from Supabase (cold-start safe).',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Optional — fetch a specific CI run by ID' },
          },
        },
      },
      {
        name: 'get_delivery_proof',
        description: 'Run a live Delivery Proof scan against a production URL. Checks homepage, readiness endpoint, health endpoint, auth gate, and GitHub repo. Returns a shareable report URL.',
        inputSchema: {
          type: 'object',
          properties: {
            production_url: { type: 'string', description: 'Base URL of the production deployment to scan' },
            repo_url: { type: 'string', description: 'GitHub repository URL (optional, for provenance)' },
            readiness_path: { type: 'string', description: 'Readiness endpoint path (default: /api/readiness)' },
          },
          required: ['production_url'],
        },
      },
    ],
  });
}
