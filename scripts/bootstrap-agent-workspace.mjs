#!/usr/bin/env node
const required = ['DSG_AGENT_ID', 'DSG_AGENT_API_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const environment = process.env.AGENT_WORKSPACE_ENV || 'development';
if (!['development', 'preview'].includes(environment)) {
  console.error('Workspace bootstrap is limited to development or preview.');
  process.exit(1);
}

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const workspaceKey = process.env.AGENT_WORKSPACE_KEY || 'dsg-agent-dev';
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${process.env.DSG_AGENT_API_KEY}`,
};

const contextResponse = await fetch(`${baseUrl}/api/agent-workspaces/context`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    agentId: process.env.DSG_AGENT_ID,
    workspaceKey,
  }),
});
const context = await contextResponse.json().catch(() => ({}));
if (!contextResponse.ok || !context?.workspace?.planHash) {
  console.error(JSON.stringify(context, null, 2));
  process.exit(1);
}

const authorizationResponse = await fetch(`${baseUrl}/api/agent-workspaces/authorize`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    agentId: process.env.DSG_AGENT_ID,
    workspaceKey,
    scope: 'workspace.bootstrap',
    environment,
    planHash: context.workspace.planHash,
    action: 'bootstrap',
    target: process.cwd(),
    evidence: {
      branch: process.env.GIT_BRANCH || null,
      commitSha: process.env.GIT_COMMIT_SHA || null,
    },
  }),
});

const authorization = await authorizationResponse.json().catch(() => ({}));
if (!authorizationResponse.ok || !authorization.allowed) {
  console.error(JSON.stringify(authorization, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  authorization,
  workspace: context.workspace,
  lease: context.lease,
  tools: context.tools,
}, null, 2));
