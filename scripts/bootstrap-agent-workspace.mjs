#!/usr/bin/env node
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DSG_AGENT_ID',
  'DSG_AGENT_API_KEY',
  'AGENT_WORKSPACE_PLAN_HASH',
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/agent-workspaces/authorize`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.DSG_AGENT_API_KEY}`,
  },
  body: JSON.stringify({
    agentId: process.env.DSG_AGENT_ID,
    workspaceKey: process.env.AGENT_WORKSPACE_KEY || 'dsg-agent-dev',
    scope: 'workspace.bootstrap',
    environment: process.env.AGENT_WORKSPACE_ENV || 'development',
    planHash: process.env.AGENT_WORKSPACE_PLAN_HASH,
    action: 'bootstrap',
    target: process.cwd(),
    evidence: {
      branch: process.env.GIT_BRANCH || null,
      commitSha: process.env.GIT_COMMIT_SHA || null,
    },
  }),
});

const result = await response.json().catch(() => ({}));
if (!response.ok || !result.allowed) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
