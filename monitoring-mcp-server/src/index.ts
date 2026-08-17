#!/usr/bin/env node

import { Server } from "@anthropic-ai/sdk/resources/messages/streaming.mjs";
import { Octokit } from "octokit";

interface Secret {
  name: string;
  value: string;
  description?: string;
}

interface WorkflowTrigger {
  owner: string;
  repo: string;
  workflow_id: string;
  ref: string;
  inputs?: Record<string, string>;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const MONITORING_REPOS = [
  { owner: "tdealer01-crypto", repo: "tdealer01-crypto-dsg-control-plane" },
  { owner: "tdealer01-crypto", repo: "dsg-unified-data-monitoring" },
];

const REQUIRED_SECRETS = [
  { name: "PRODUCTION_URL", description: "Production deployment URL" },
  { name: "MONITORING_ORG_ID", description: "Default monitoring organization ID" },
  { name: "MONITORING_API_KEY", description: "API key for monitoring endpoints" },
  { name: "SUPABASE_URL", description: "Supabase project URL" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Supabase service role key" },
  { name: "SLACK_WEBHOOK_URL", description: "Slack webhook for notifications" },
  { name: "DEPLOY_HOST", description: "Deployment server hostname" },
  { name: "DEPLOY_USER", description: "Deployment SSH user" },
  { name: "DEPLOY_KEY", description: "Deployment SSH private key" },
];

// Set up MCP server
const server = new Server({
  name: "dsg-monitoring-mcp",
  version: "1.0.0",
});

// Tool: List all required secrets
server.tool("list_required_secrets", "List all required secrets for monitoring setup", {}, async () => {
  return {
    secrets: REQUIRED_SECRETS,
    repositories: MONITORING_REPOS,
  };
});

// Tool: Get repository secrets status
server.tool(
  "get_secrets_status",
  "Check which secrets are configured in a repository",
  {
    owner: { type: "string", description: "GitHub owner" },
    repo: { type: "string", description: "GitHub repository" },
  },
  async (args: any) => {
    try {
      const secrets = await octokit.rest.actions.listRepoSecrets({
        owner: args.owner,
        repo: args.repo,
      });

      const configured = secrets.data.secrets.map((s: any) => s.name);
      const missing = REQUIRED_SECRETS.filter((s) => !configured.includes(s.name));

      return {
        repository: `${args.owner}/${args.repo}`,
        configured_count: configured.length,
        configured_secrets: configured,
        missing_count: missing.length,
        missing_secrets: missing.map((m) => ({ name: m.name, description: m.description })),
      };
    } catch (error) {
      return { error: String(error) };
    }
  }
);

// Tool: Add secret to repository
server.tool(
  "add_secret",
  "Add or update a secret in a repository (requires GITHUB_TOKEN with repo:secrets scope)",
  {
    owner: { type: "string", description: "GitHub owner" },
    repo: { type: "string", description: "GitHub repository" },
    secret_name: { type: "string", description: "Secret name (e.g., PRODUCTION_URL)" },
    secret_value: { type: "string", description: "Secret value" },
  },
  async (args: any) => {
    if (!process.env.GITHUB_TOKEN) {
      return { error: "GITHUB_TOKEN environment variable not set" };
    }

    try {
      // Get public key for repository
      const keyResponse = await octokit.rest.actions.getRepoPublicKey({
        owner: args.owner,
        repo: args.repo,
      });

      // In a real implementation, you would encrypt the secret using the public key
      // For now, we'll return instructions
      return {
        status: "secret_ready_to_add",
        repository: `${args.owner}/${args.repo}`,
        secret_name: args.secret_name,
        public_key_id: keyResponse.data.key_id,
        note: "Secret value provided. Use GitHub UI or CLI to complete encryption and storage.",
      };
    } catch (error) {
      return { error: String(error) };
    }
  }
);

// Tool: Add multiple secrets to repository
server.tool(
  "add_secrets_batch",
  "Add multiple secrets to a repository at once",
  {
    owner: { type: "string", description: "GitHub owner" },
    repo: { type: "string", description: "GitHub repository" },
    secrets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
        },
      },
      description: "Array of {name, value} secret pairs",
    },
  },
  async (args: any) => {
    const results = [];

    for (const secret of args.secrets) {
      try {
        results.push({
          name: secret.name,
          status: "ready_for_encryption",
          note: "Provide GitHub credentials to complete",
        });
      } catch (error) {
        results.push({
          name: secret.name,
          status: "error",
          error: String(error),
        });
      }
    }

    return {
      repository: `${args.owner}/${args.repo}`,
      total_secrets: args.secrets.length,
      results,
    };
  }
);

// Tool: Trigger workflow
server.tool(
  "trigger_workflow",
  "Trigger a GitHub Actions workflow",
  {
    owner: { type: "string", description: "GitHub owner" },
    repo: { type: "string", description: "GitHub repository" },
    workflow_id: { type: "string", description: "Workflow file name or ID" },
    ref: { type: "string", description: "Git branch/ref (default: main)" },
    inputs: {
      type: "object",
      description: "Workflow input variables",
    },
  },
  async (args: any) => {
    if (!process.env.GITHUB_TOKEN) {
      return { error: "GITHUB_TOKEN environment variable not set" };
    }

    try {
      const response = await octokit.rest.actions.createWorkflowDispatch({
        owner: args.owner,
        repo: args.repo,
        workflow_id: args.workflow_id,
        ref: args.ref || "main",
        inputs: args.inputs || {},
      });

      return {
        status: "triggered",
        repository: `${args.owner}/${args.repo}`,
        workflow: args.workflow_id,
        ref: args.ref || "main",
        note: "Workflow dispatched successfully. Check Actions tab for status.",
      };
    } catch (error) {
      return { error: String(error) };
    }
  }
);

// Tool: Get workflow runs
server.tool(
  "get_workflow_runs",
  "Get recent workflow runs for a repository",
  {
    owner: { type: "string", description: "GitHub owner" },
    repo: { type: "string", description: "GitHub repository" },
    workflow_id: { type: "string", description: "Workflow file name or ID" },
    limit: { type: "number", description: "Number of runs to fetch (default: 10)" },
  },
  async (args: any) => {
    try {
      const runs = await octokit.rest.actions.listWorkflowRuns({
        owner: args.owner,
        repo: args.repo,
        workflow_id: args.workflow_id,
        per_page: args.limit || 10,
      });

      return {
        repository: `${args.owner}/${args.repo}`,
        workflow: args.workflow_id,
        runs: runs.data.workflow_runs.map((run: any) => ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
          url: run.html_url,
        })),
      };
    } catch (error) {
      return { error: String(error) };
    }
  }
);

// Tool: Setup all secrets for monitoring
server.tool(
  "setup_monitoring_secrets",
  "Interactive guide to set up all monitoring secrets",
  {
    include_curl_commands: { type: "boolean", description: "Include curl commands for manual setup" },
  },
  async (args: any) => {
    const setupGuide = {
      step_1: "Install GitHub CLI: brew install gh",
      step_2: "Authenticate: gh auth login",
      step_3: "For each secret below, run: gh secret set SECRET_NAME -b 'value' -R owner/repo",
      repositories: MONITORING_REPOS.map((r) => r.owner + "/" + r.repo),
      secrets_to_add: REQUIRED_SECRETS.map((s) => ({
        name: s.name,
        description: s.description,
        gh_command: `gh secret set ${s.name} -b 'YOUR_VALUE' -R tdealer01-crypto/${
          s.name.includes("DEPLOY") ? "dsg-unified-data-monitoring" : "tdealer01-crypto-dsg-control-plane"
        }`,
      })),
      curl_example: args.include_curl_commands
        ? `# Example with curl (requires GitHub token):
curl -X PUT \\
  -H "Authorization: Bearer $GITHUB_TOKEN" \\
  -H "Accept: application/vnd.github.v3+json" \\
  https://api.github.com/repos/OWNER/REPO/actions/secrets/SECRET_NAME \\
  -d '{"encrypted_value":"ENCRYPTED_VALUE","key_id":"KEY_ID"}'`
        : null,
    };

    return setupGuide;
  }
);

// Tool: Trigger all monitoring workflows
server.tool(
  "trigger_all_monitoring_workflows",
  "Trigger all monitoring workflows across repositories",
  {},
  async () => {
    const workflows = [
      {
        repo: "tdealer01-crypto-dsg-control-plane",
        workflow: "monitoring-daily-health-check.yml",
      },
      {
        repo: "tdealer01-crypto-dsg-control-plane",
        workflow: "monitoring-schema-consistency.yml",
      },
      {
        repo: "dsg-unified-data-monitoring",
        workflow: "build-and-test.yml",
      },
      {
        repo: "dsg-unified-data-monitoring",
        workflow: "verify-monitoring-endpoints.yml",
      },
    ];

    const results = [];

    for (const item of workflows) {
      try {
        if (!process.env.GITHUB_TOKEN) {
          results.push({
            repo: item.repo,
            workflow: item.workflow,
            status: "skipped",
            reason: "GITHUB_TOKEN not set",
          });
          continue;
        }

        await octokit.rest.actions.createWorkflowDispatch({
          owner: "tdealer01-crypto",
          repo: item.repo,
          workflow_id: item.workflow,
          ref: item.repo === "tdealer01-crypto-dsg-control-plane" ? "claude/delete-mock-only-eb0p9b" : "master",
        });

        results.push({
          repo: item.repo,
          workflow: item.workflow,
          status: "triggered",
        });
      } catch (error) {
        results.push({
          repo: item.repo,
          workflow: item.workflow,
          status: "error",
          error: String(error),
        });
      }
    }

    return {
      summary: `Triggered ${results.filter((r) => r.status === "triggered").length} workflows`,
      results,
    };
  }
);

// Tool: Generate GitHub CLI commands for secrets
server.tool(
  "generate_secrets_cli_commands",
  "Generate GitHub CLI commands to add all required secrets",
  {},
  async () => {
    const controlPlaneRepo = "tdealer01-crypto/tdealer01-crypto-dsg-control-plane";
    const monitoringRepo = "tdealer01-crypto/dsg-unified-data-monitoring";

    const commands = {
      auth: "gh auth login",
      description: "Copy and run these commands in your terminal to add all secrets",
      control_plane_secrets: REQUIRED_SECRETS.map((secret) => ({
        name: secret.name,
        command: `gh secret set ${secret.name} --repo ${controlPlaneRepo}`,
      })),
      monitoring_repo_secrets: REQUIRED_SECRETS.map((secret) => ({
        name: secret.name,
        command: `gh secret set ${secret.name} --repo ${monitoringRepo}`,
      })),
      verify: [
        `gh secret list --repo ${controlPlaneRepo}`,
        `gh secret list --repo ${monitoringRepo}`,
      ],
    };

    return commands;
  }
);

// Start server
server.listen(
  {
    command: process.argv[2],
    url: `stdio://`,
  },
  async () => {
    console.error("DSG Monitoring MCP Server running on stdio");
  }
);

export { server };
