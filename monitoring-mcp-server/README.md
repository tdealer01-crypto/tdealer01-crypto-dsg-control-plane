# DSG Monitoring MCP Server

Model Context Protocol server for managing GitHub Secrets and triggering monitoring workflows across DSG repositories.

## Features

- **Secrets Management:** View, add, and manage GitHub secrets across repositories
- **Workflow Automation:** Trigger monitoring workflows with custom inputs
- **Status Tracking:** Monitor workflow execution and results
- **Setup Guide:** Interactive setup for monitoring infrastructure
- **CLI Generation:** Auto-generate GitHub CLI commands for secret management

## Installation

```bash
npm install
```

## Available Tools

### 1. `list_required_secrets`
Lists all required secrets for monitoring setup.

```javascript
// Returns array of required secrets and target repositories
```

### 2. `get_secrets_status`
Check which secrets are configured in a repository.

**Parameters:**
- `owner` (string): GitHub owner
- `repo` (string): GitHub repository

**Returns:** Status of configured and missing secrets

### 3. `add_secret`
Add or update a secret in a repository.

**Parameters:**
- `owner` (string): GitHub owner
- `repo` (string): GitHub repository
- `secret_name` (string): Secret name (e.g., PRODUCTION_URL)
- `secret_value` (string): Secret value

**Note:** Requires GITHUB_TOKEN with `repo:secrets` scope

### 4. `add_secrets_batch`
Add multiple secrets to a repository at once.

**Parameters:**
- `owner` (string): GitHub owner
- `repo` (string): GitHub repository
- `secrets` (array): Array of {name, value} pairs

### 5. `trigger_workflow`
Trigger a GitHub Actions workflow.

**Parameters:**
- `owner` (string): GitHub owner
- `repo` (string): GitHub repository
- `workflow_id` (string): Workflow file name or ID
- `ref` (string): Git branch/ref (default: main)
- `inputs` (object): Workflow input variables

### 6. `get_workflow_runs`
Get recent workflow runs for a repository.

**Parameters:**
- `owner` (string): GitHub owner
- `repo` (string): GitHub repository
- `workflow_id` (string): Workflow file name or ID
- `limit` (number): Number of runs to fetch (default: 10)

### 7. `setup_monitoring_secrets`
Interactive guide to set up all monitoring secrets.

**Parameters:**
- `include_curl_commands` (boolean): Include curl commands for manual setup

### 8. `trigger_all_monitoring_workflows`
Trigger all monitoring workflows across repositories.

### 9. `generate_secrets_cli_commands`
Generate GitHub CLI commands to add all required secrets.

## Required Secrets

The following secrets must be configured in each repository:

| Secret | Description | Example |
|--------|-------------|---------|
| `PRODUCTION_URL` | Production deployment URL | https://dsg-one-v1-aimo.onrender.com |
| `MONITORING_ORG_ID` | Default monitoring organization ID | org-123-abc |
| `MONITORING_API_KEY` | API key for monitoring endpoints | sk-... |
| `SUPABASE_URL` | Supabase project URL | https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | eyJhbGc... |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | https://hooks.slack.com/... |
| `DEPLOY_HOST` | Deployment server hostname | deploy.example.com |
| `DEPLOY_USER` | Deployment SSH user | deploy |
| `DEPLOY_KEY` | Deployment SSH private key | -----BEGIN PRIVATE KEY----- |

## Setup Instructions

### Option 1: Using GitHub CLI

```bash
# 1. Authenticate with GitHub
gh auth login

# 2. Add secrets to control-plane repository
gh secret set PRODUCTION_URL --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane
gh secret set MONITORING_ORG_ID --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane
gh secret set MONITORING_API_KEY --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane
# ... repeat for all secrets

# 3. Add secrets to monitoring repository
gh secret set PRODUCTION_URL --repo tdealer01-crypto/dsg-unified-data-monitoring
# ... repeat for all secrets

# 4. Verify secrets are configured
gh secret list --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane
gh secret list --repo tdealer01-crypto/dsg-unified-data-monitoring
```

### Option 2: Using This MCP Server

```javascript
// List required secrets
const secrets = await mcp.call('list_required_secrets', {});

// Check configuration status
const status = await mcp.call('get_secrets_status', {
  owner: 'tdealer01-crypto',
  repo: 'tdealer01-crypto-dsg-control-plane'
});

// Generate CLI commands
const commands = await mcp.call('generate_secrets_cli_commands', {});

// Add a secret
await mcp.call('add_secret', {
  owner: 'tdealer01-crypto',
  repo: 'tdealer01-crypto-dsg-control-plane',
  secret_name: 'PRODUCTION_URL',
  secret_value: 'https://your-url.com'
});
```

### Option 3: Using GitHub UI

1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret from the table above
4. Repeat for both repositories

## Triggering Workflows

### Trigger a specific workflow:

```javascript
await mcp.call('trigger_workflow', {
  owner: 'tdealer01-crypto',
  repo: 'tdealer01-crypto-dsg-control-plane',
  workflow_id: 'monitoring-daily-health-check.yml',
  ref: 'claude/delete-mock-only-eb0p9b'
});
```

### Trigger all monitoring workflows:

```javascript
await mcp.call('trigger_all_monitoring_workflows', {});
```

### Get workflow status:

```javascript
const runs = await mcp.call('get_workflow_runs', {
  owner: 'tdealer01-crypto',
  repo: 'tdealer01-crypto-dsg-control-plane',
  workflow_id: 'monitoring-daily-health-check.yml',
  limit: 5
});
```

## Environment Variables

```bash
# Required
GITHUB_TOKEN=your-github-token

# Optional
MCP_PORT=3000  # Port for MCP server
```

## Running the Server

### Development:

```bash
npm run dev
```

### Production:

```bash
npm run build
npm start
```

## Monitored Workflows

### Control Plane Repository
- `monitoring-daily-health-check.yml` - Daily 9 AM UTC health check
- `monitoring-schema-consistency.yml` - Every 6 hours schema verification

### Monitoring Repository
- `build-and-test.yml` - Build and test on push/PR
- `deploy-monitoring.yml` - Manual production deployment
- `verify-monitoring-endpoints.yml` - Every 30 minutes endpoint verification

## Integration with Claude Code

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "dsg-monitoring": {
      "command": "node",
      "args": ["monitoring-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│     Claude Code / MCP Client            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   DSG Monitoring MCP Server             │
│  ├─ Secrets Management                  │
│  ├─ Workflow Triggers                   │
│  ├─ Status Tracking                     │
│  └─ CLI Command Generation              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      GitHub REST API (Octokit)          │
└─────────────────────────────────────────┘
```

## Workflow Execution Flow

1. **Setup Secrets** → `add_secret` / `add_secrets_batch`
2. **Verify Config** → `get_secrets_status`
3. **Trigger Workflows** → `trigger_workflow` / `trigger_all_monitoring_workflows`
4. **Monitor Execution** → `get_workflow_runs`
5. **Review Results** → GitHub Actions UI

## Troubleshooting

### GITHUB_TOKEN not set
```bash
export GITHUB_TOKEN=your_github_token
```

### Workflow not triggering
- Verify GITHUB_TOKEN has `repo:secrets` and `actions` scopes
- Check workflow file name matches exactly
- Ensure branch/ref exists

### Secrets not visible
- Secrets are write-only in GitHub API
- Use `get_secrets_status` to verify they were added
- Check repository settings in GitHub UI

## License

MIT
