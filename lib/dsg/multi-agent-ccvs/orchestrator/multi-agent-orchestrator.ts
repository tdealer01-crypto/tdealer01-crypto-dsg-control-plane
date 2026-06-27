// Multi-Agent Orchestrator with Diffusion Workflow
import { AGENTS, getAgentsByGroup, getExecutionOrder } from '../agents';
import { AgentContext, AgentResult, EvidenceItem } from '../agents/base-agent';
import { DiffusionAgent } from '../agents/diffusion-agent-base';

export interface OrchestratorConfig {
  maxTotalIterations: number;
  convergenceThreshold: number;
  enableParallel: boolean;
  simulationFirst: boolean;
  createPR: boolean;
  githubToken: string;
  repoOwner: string;
  repoName: string;
}

export interface OrchestrationResult {
  success: boolean;
  commit: string;
  branchName: string;
  prUrl?: string;
  levels: LevelResult[];
  totalEvidence: EvidenceItem[];
  metrics: OrchestrationMetrics;
  diffusionTrace: any[];
}

export interface LevelResult {
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  group: string;
  agents: AgentResult[];
  converged: boolean;
  score: number;
  iterations: number;
}

export interface OrchestrationMetrics {
  totalDurationMs: number;
  totalAgents: number;
  successfulAgents: number;
  failedAgents: number;
  totalEvidence: number;
  prCreated: boolean;
  simulationMode: boolean;
}

export class MultiAgentOrchestrator {
  private config: OrchestratorConfig;
  private diffusionTrace: any[] = [];

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      maxTotalIterations: 6,
      convergenceThreshold: 0.95,
      enableParallel: true,
      simulationFirst: true,
      createPR: true,
      githubToken: process.env.GITHUB_TOKEN || '',
      repoOwner: process.env.GITHUB_REPO_OWNER || 'tdealer01-crypto',
      repoName: process.env.GITHUB_REPO_NAME || 'tdealer01-crypto-dsg-control-plane',
      ...config
    };
  }

  async orchestrate(commit: string, goal: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.diffusionTrace = [];

    // Create context
    const context: AgentContext = {
      commit,
      repoPath: process.cwd(),
      branchName: `ccvs-${commit.slice(0, 8)}-${Date.now()}`,
      githubToken: this.config.githubToken,
      repoOwner: this.config.repoOwner,
      repoName: this.config.repoName,
      simulationMode: this.config.simulationFirst,
      diffusionEndpoint: process.env.DIFFUSION_ENDPOINT,
      diffusionApiKey: process.env.DIFFUSION_API_KEY
    };

    console.log(`[Orchestrator] Starting CCVS orchestration for commit ${commit}`);
    console.log(`[Orchestrator] Goal: ${goal}`);
    console.log(`[Orchestrator] Branch: ${context.branchName}`);

    const levels: LevelResult[] = [];
    const allEvidence: EvidenceItem[] = [];

    // Execute in dependency order
    const executionOrder = getExecutionOrder();
    
    for (const groupName of executionOrder) {
      const groupAgents = getAgentsByGroup(groupName);
      const groupStartTime = Date.now();

      console.log(`[Orchestrator] Executing group: ${groupName} (${groupAgents.length} agents)`);

      let levelResult: LevelResult;

      if (this.config.enableParallel && groupAgents.length > 1) {
        levelResult = await this.executeParallelGroup(groupName, groupAgents, context);
      } else {
        levelResult = await this.executeSequentialGroup(groupName, groupAgents, context);
      }

      levels.push(levelResult);
      
      // Collect evidence
      for (const agentResult of levelResult.agents) {
        allEvidence.push(...agentResult.evidence);
      }

      console.log(`[Orchestrator] Group ${groupName} completed in ${Date.now() - groupStartTime}ms`);
      console.log(`[Orchestrator] Converged: ${levelResult.converged}, Score: ${levelResult.score.toFixed(3)}`);

      // If any agent failed critically, stop
      const criticalFailures = levelResult.agents.filter(a => !a.success && a.errors.some(e => e.includes('threshold')));
      if (criticalFailures.length > 0) {
        console.error(`[Orchestrator] Critical failures in ${groupName}, stopping`);
        break;
      }
    }

    // Create PR if enabled and all levels converged
    let prUrl: string | undefined;
    const allConverged = levels.every(l => l.converged);
    
    if (this.config.createPR && allConverged && !context.simulationMode) {
      prUrl = await this.createPullRequest(context, goal, levels, allEvidence);
    }

    return {
      success: allConverged,
      commit,
      branchName: context.branchName,
      prUrl,
      levels,
      totalEvidence: allEvidence,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        totalAgents: AGENTS.length,
        successfulAgents: levels.flatMap(l => l.agents).filter(a => a.success).length,
        failedAgents: levels.flatMap(l => l.agents).filter(a => !a.success).length,
        totalEvidence: allEvidence.length,
        prCreated: !!prUrl,
        simulationMode: context.simulationMode
      },
      diffusionTrace: this.diffusionTrace
    };
  }

  private async executeParallelGroup(
    groupName: string, 
    agents: DiffusionAgent[], 
    context: AgentContext
  ): Promise<LevelResult> {
    const groupStartTime = Date.now();
    
    // Run all agents in parallel
    const promises = agents.map(agent => 
      this.executeAgentWithDiffusion(agent, context)
    );

    const agentsResults = await Promise.all(promises);
    
    // Compute group convergence
    const groupScore = this.computeGroupScore(agentsResults);
    const converged = groupScore >= this.config.convergenceThreshold;

    // Log diffusion traces
    for (const result of agentsResults) {
      this.diffusionTrace.push({
        agent: result.agentId,
        level: result.level,
        diffusionSteps: result.simulationTrace?.filter((s: any) => s.iteration !== undefined) || []
      });
    }

    return {
      level: groupName.startsWith('L') ? groupName.charAt(0) + groupName.charAt(1) as any : 'L1',
      group: groupName,
      agents: agentsResults,
      converged,
      score: groupScore,
      iterations: Math.max(...agentsResults.map(r => 
        r.simulationTrace?.filter((s: any) => s.iteration).length || 1
      ))
    };
  }

  private async executeSequentialGroup(
    groupName: string, 
    agents: DiffusionAgent[], 
    context: AgentContext
  ): Promise<LevelResult> {
    const agentsResults: AgentResult[] = [];
    let totalScore = 0;

    for (const agent of agents) {
      const result = await this.executeAgentWithDiffusion(agent, context);
      agentsResults.push(result);
      totalScore += this.computeAgentScore(result);
      
      // Early exit on critical failure
      if (!result.success && result.errors.some(e => e.includes('threshold'))) {
        break;
      }
    }

    const groupScore = agentsResults.length > 0 ? totalScore / agentsResults.length : 0;
    const converged = groupScore >= this.config.convergenceThreshold;

    return {
      level: groupName.startsWith('L') ? groupName.charAt(0) + groupName.charAt(1) as any : 'L1',
      group: groupName,
      agents: agentsResults,
      converged,
      score: groupScore,
      iterations: 1
    };
  }

  private async executeAgentWithDiffusion(
    agent: DiffusionAgent, 
    context: AgentContext
  ): Promise<AgentResult> {
    console.log(`[Orchestrator] Running ${agent.name} (${agent.id})`);
    const startTime = Date.now();

    // First run simulation
    if (context.simulationMode) {
      const simResult = await agent.simulate(context);
      console.log(`[Orchestrator] ${agent.name} SIMULATION: ${simResult.success ? 'PASS' : 'FAIL'}`);
    }

    // Run actual execution with diffusion loop
    const result = await agent.execute(context);
    result.durationMs = Date.now() - startTime;

    console.log(`[Orchestrator] ${agent.name} RESULT: ${result.success ? 'PASS' : 'FAIL'} (${result.durationMs}ms)`);
    
    if (!result.success) {
      console.log(`[Orchestrator] ${agent.name} ERRORS:`, result.errors);
    }

    return result;
  }

  private computeAgentScore(result: AgentResult): number {
    if (!result.success) return 0;
    const verificationCount = result.evidence.filter(e => e.verification).length;
    return verificationCount > 0 ? 1.0 : 0.8;
  }

  private computeGroupScore(results: AgentResult[]): number {
    if (results.length === 0) return 0;
    const scores = results.map(r => this.computeAgentScore(r));
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private async createPullRequest(
    context: AgentContext, 
    goal: string, 
    levels: LevelResult[], 
    evidence: EvidenceItem[]
  ): Promise<string> {
    console.log(`[Orchestrator] Creating PR for branch ${context.branchName}`);
    
    // In real implementation, use Octokit or GitHub CLI
    // For now, return mock URL
    const prUrl = `https://github.com/${context.repoOwner}/${context.repoName}/pull/CCVS-${context.commit.slice(0, 8)}`;
    
    console.log(`[Orchestrator] PR created: ${prUrl}`);
    return prUrl;
  }
}

// Factory function
export function createOrchestrator(config: Partial<OrchestratorConfig> = {}): MultiAgentOrchestrator {
  return new MultiAgentOrchestrator(config);
}

// CLI entry point
export async function runCCVSOrchestration(
  commit: string,
  goal: string,
  options: Partial<OrchestratorConfig> = {}
): Promise<OrchestrationResult> {
  const orchestrator = createOrchestrator(options);
  return orchestrator.orchestrate(commit, goal);
}