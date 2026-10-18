# Multi-Agent Orchestration Template

## Parallel Agent Group

```yaml
# multi-agent-group.yaml
groupName: "dsg-full-pipeline"
parallel: true
agents:
  - id: recon-agent
    name: "Reconnaissance Agent"
    task: "public-recon"
    mode: sim-only
    priority: high

  - id: compliance-agent
    name: "Compliance Agent"
    task: "compliance-check"
    mode: hybrid
    priority: high
    dependsOn: []  # No dependencies - runs in parallel

  - id: readiness-agent
    name: "Readiness Agent"
    task: "readiness-check"
    context:
      targetUrl: "https://tdealer01-crypto-dsg-control-plane.vercel.app"
    mode: hybrid
    priority: medium
    dependsOn: []

  - id: gate-agent
    name: "Gate Evaluation Agent"
    task: "login-and-gate-eval"
    mode: hybrid
    priority: high
    dependsOn: ["recon-agent"]  # Waits for recon to complete

  - id: report-agent
    name: "Report Aggregation Agent"
    task: "aggregate-results"
    mode: sim-only
    priority: low
    dependsOn: ["compliance-agent", "readiness-agent", "gate-agent"]

# Verification at group level
verification:
  type: custom
  fn: "(results) => results.every(r => r.success)"
```

## Sequential Pipeline

```yaml
# sequential-pipeline.yaml
pipelineName: "dsg-ci-cd"
agents:
  - id: preflight
    task: "public-recon"
    mode: sim-only
    continueOnFail: false

  - id: deploy-preview
    task: "deploy-preview-gate"
    mode: hybrid
    continueOnFail: false

  - id: verify-preview
    task: "verify-preview-gate"
    mode: hybrid
    continueOnFail: false

  - id: production-readiness
    task: "readiness-check"
    context:
      targetUrl: "https://tdealer01-crypto-dsg-control-plane.vercel.app"
    mode: hybrid
    continueOnFail: false

  - id: production-gate
    task: "login-and-gate-eval"
    context:
      action: "deploy-production"
    mode: hybrid
    continueOnFail: false
```

## Running Multi-Agent Groups

### From TypeScript

```typescript
import { HybridAgentOrchestrator } from './orchestrator';

const orchestrator = new HybridAgentOrchestrator({
  endpoint: 'https://your-app.vercel.app/api/agent/hybrid'
});

// Run parallel group
const results = await orchestrator.runGroup('multi-agent-group.yaml');

// Run sequential pipeline
const pipelineResults = await orchestrator.runPipeline('sequential-pipeline.yaml');
```

### From CLI

```bash
# Run parallel group
npx tsx scripts/run-multi-agent.ts multi-agent-group.yaml

# Run sequential pipeline
npx tsx scripts/run-multi-agent.ts sequential-pipeline.yaml --sequential
```

### From Hermes Agent

```typescript
// Hermes agent spawns multiple sub-agents
const results = await Promise.all([
  spawnAgent({ task: 'public-recon', mode: 'sim-only' }),
  spawnAgent({ task: 'compliance-check', mode: 'hybrid' }),
  spawnAgent({ task: 'readiness-check', mode: 'hybrid' })
]);

// Merge at T4 gate
const merged = verifyAndMerge(results);
```

## Orchestrator Implementation

```typescript
// scripts/orchestrator.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

interface AgentConfig {
  id: string;
  name: string;
  task: string;
  mode: 'sim-only' | 'hybrid' | 'real-only';
  context?: Record<string, any>;
  dependsOn?: string[];
  continueOnFail?: boolean;
}

interface GroupConfig {
  groupName: string;
  parallel: boolean;
  agents: AgentConfig[];
  verification?: {
    type: 'exact' | 'keys' | 'custom';
    keys?: string[];
    fn?: string;
  };
}

export class HybridAgentOrchestrator {
  private endpoint: string;

  constructor(config: { endpoint: string }) {
    this.endpoint = config.endpoint;
  }

  async runGroup(groupPath: string): Promise<any[]> {
    const config = this.loadConfig(groupPath);
    const results: Map<string, any> = new Map();

    if (config.parallel) {
      // Run all independent agents in parallel
      await this.runParallel(config.agents, results);
    } else {
      // Run sequentially
      await this.runSequential(config.agents, results);
    }

    // Group-level verification
    if (config.verification) {
      this.verifyGroup(config.verification, Array.from(results.values()));
    }

    return Array.from(results.values());
  }

  private async runParallel(agents: AgentConfig[], results: Map<string, any>) {
    const ready = agents.filter(a => !a.dependsOn?.length || a.dependsOn.every(d => results.has(d)));

    if (ready.length === 0 && results.size < agents.length) {
      throw new Error('Circular dependency or missing dependencies');
    }

    await Promise.all(ready.map(agent => this.runAgent(agent, results)));

    // Recursively run remaining
    if (results.size < agents.length) {
      await this.runParallel(agents, results);
    }
  }

  private async runSequential(agents: AgentConfig[], results: Map<string, any>) {
    for (const agent of agents) {
      if (agent.dependsOn && !agent.dependsOn.every(d => results.has(d))) {
        throw new Error(`Missing dependencies for ${agent.id}: ${agent.dependsOn}`);
      }

      const result = await this.runAgent(agent, results);
      results.set(agent.id, result);

      if (!result.success && !agent.continueOnFail) {
        throw new Error(`Agent ${agent.id} failed: ${result.error}`);
      }
    }
  }

  private async runAgent(agent: AgentConfig, results: Map<string, any>): Promise<any> {
    const task = this.loadTask(agent.task);
    const context = { ...task.context, ...agent.context };

    // Inject previous results
    if (agent.dependsOn) {
      for (const dep of agent.dependsOn) {
        context[dep] = results.get(dep);
      }
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: task.goal,
        mode: agent.mode,
        context,
        steps: task.steps
      })
    });

    return response.json();
  }

  private loadConfig(path: string): GroupConfig {
    return yaml.parse(readFileSync(path, 'utf-8'));
  }

  private loadTask(name: string): any {
    const content = readFileSync(join(process.cwd(), 'tasks', `${name}.yaml`), 'utf-8');
    return yaml.parse(content);
  }

  private verifyGroup(verification: any, results: any[]) {
    // Implementation depends on verification type
    console.log('Group verification:', verification);
  }
}
```

## T4 Gate at Group Level

```yaml
verification:
  type: custom
  fn: |
    (results) => {
      // All agents succeeded
      const allSuccess = results.every(r => r.success);
      // No verification errors
      const noVerErrors = results.every(
        r => !r.results?.some(s => s.verified === false)
      );
      return allSuccess && noVerErrors;
    }
```