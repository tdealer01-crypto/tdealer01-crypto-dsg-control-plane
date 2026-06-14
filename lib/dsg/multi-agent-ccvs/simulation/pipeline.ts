// Simulation-First Execution Pipeline
import { MultiAgentOrchestrator } from '../orchestrator/multi-agent-orchestrator';
import { GHPRAutomation } from '../github/ghpr-automation';
import { AgentContext } from '../agents/base-agent';

export interface SimulationPipelineConfig {
  orchestrator: {
    maxTotalIterations: number;
    convergenceThreshold: number;
    enableParallel: boolean;
    simulationFirst: boolean;
    createPR: boolean;
    githubToken: string;
    repoOwner: string;
    repoName: string;
  };
  github: {
    token: string;
    owner: string;
    repo: string;
    baseBranch: string;
  };
  dryRun: boolean;
  outputDir: string;
  verbose: boolean;
}

export class SimulationPipeline {
  private config: SimulationPipelineConfig;
  private orchestrator: MultiAgentOrchestrator;
  private ghpr?: GHPRAutomation;

  constructor(config: Partial<SimulationPipelineConfig> = {}) {
    this.config = {
      orchestrator: {
        maxTotalIterations: 6,
        convergenceThreshold: 0.95,
        enableParallel: true,
        simulationFirst: true,
        createPR: true,
        githubToken: process.env.GITHUB_TOKEN || '',
        repoOwner: process.env.GITHUB_REPO_OWNER || 'tdealer01-crypto',
        repoName: process.env.GITHUB_REPO_NAME || 'tdealer01-crypto-dsg-control-plane',
        ...config.orchestrator
      },
      github: {
        token: process.env.GITHUB_TOKEN || '',
        owner: process.env.GITHUB_REPO_OWNER || 'tdealer01-crypto',
        repo: process.env.GITHUB_REPO_NAME || 'tdealer01-crypto-dsg-control-plane',
        baseBranch: 'main',
        ...config.github
      },
      dryRun: config.dryRun ?? true,
      outputDir: config.outputDir || './ccvs-output',
      verbose: config.verbose ?? true
    };

    this.orchestrator = new MultiAgentOrchestrator(this.config.orchestrator);
    
    if (this.config.github.token) {
      this.ghpr = new GHPRAutomation(this.config.github);
    }
  }

  async run(commit: string, goal: string): Promise<any> {
    this.log('Starting CCVS Simulation Pipeline');
    this.log('Commit: ' + commit);
    this.log('Goal: ' + goal);
    this.log('Dry Run: ' + this.config.dryRun);

    // Phase 1: SIMULATION FIRST (all agents in sim mode)
    if (this.config.orchestrator.simulationFirst) {
      this.log('\n=== PHASE 1: SIMULATION ===');
      const simContext = await this.createSimulationContext(commit);
      simContext.simulationMode = true;
      
      const simResult = await this.runSimulation(simContext, goal);
      this.logSimulationResults(simResult);
      
      if (!simResult.success) {
        this.log('SIMULATION FAILED - Stopping before real execution');
        return simResult;
      }
      
      this.log('SIMULATION PASSED - Proceeding to real execution');
    }

    // Phase 2: REAL EXECUTION (optional, controlled by dryRun)
    if (!this.config.dryRun) {
      this.log('\n=== PHASE 2: REAL EXECUTION ===');
      const realContext = await this.createRealContext(commit);
      realContext.simulationMode = false;
      
      const realResult = await this.runRealExecution(realContext, goal);
      this.logRealResults(realResult);
      
      // Write evidence files after real execution
      await this.writeEvidenceFiles(realResult);
      
      // Phase 3: CREATE PR
      if (this.config.orchestrator.createPR && this.ghpr && realResult.success) {
        this.log('\n=== PHASE 3: CREATE PR ===');
        await this.createPullRequest(realResult, goal);
      }
      
      return realResult;
    } else {
      // In dry-run mode, still write evidence files for artifact upload
      const simResult = await this.runSimulation(await this.createSimulationContext(commit), goal);
      await this.writeEvidenceFiles(simResult);
      this.log('\nDry run complete. Set dryRun=false to execute for real.');
      return { success: true };
    }
  }

  private async createSimulationContext(commit: string): Promise<AgentContext> {
    return {
      commit,
      repoPath: process.cwd(),
      branchName: 'sim-ccvs-' + commit.slice(0, 8) + '-' + Date.now(),
      githubToken: this.config.github.token,
      repoOwner: this.config.github.owner,
      repoName: this.config.github.repo,
      simulationMode: true,
      diffusionEndpoint: process.env.DIFFUSION_ENDPOINT,
      diffusionApiKey: process.env.DIFFUSION_API_KEY
    };
  }

  private async createRealContext(commit: string): Promise<AgentContext> {
    return {
      commit,
      repoPath: process.cwd(),
      branchName: 'ccvs-' + commit.slice(0, 8) + '-' + Date.now(),
      githubToken: this.config.github.token,
      repoOwner: this.config.github.owner,
      repoName: this.config.github.repo,
      simulationMode: false,
      diffusionEndpoint: process.env.DIFFUSION_ENDPOINT,
      diffusionApiKey: process.env.DIFFUSION_API_KEY
    };
  }

  private async runSimulation(context: AgentContext, goal: string): Promise<any> {
    this.log('Running simulation for all 10 agents...');
    
    const originalMode = this.config.orchestrator.simulationFirst;
    this.config.orchestrator.simulationFirst = true;
    
    const result = await this.orchestrator.orchestrate(context.commit, goal);
    
    this.config.orchestrator.simulationFirst = originalMode;
    return result;
  }

  private async runRealExecution(context: AgentContext, goal: string): Promise<any> {
    this.log('Running real execution for all 10 agents...');
    return this.orchestrator.orchestrate(context.commit, goal);
  }

  private async createPullRequest(result: any, goal: string): Promise<void> {
    if (!this.ghpr) {
      this.log('GitHub PR automation not configured (no token)');
      return;
    }
    
    // Write evidence files to output directory
    await this.writeEvidenceFiles(result);
    
    this.log('Creating PR with evidence...');
    const pr = await this.ghpr.createCCVSPR(result, goal);
    this.log('PR created: ' + pr.url);
  }
  
  private async writeEvidenceFiles(result: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const outputDir = this.config.outputDir;
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write evidence summary
    const summary = {
      commit: result.commit,
      branchName: result.branchName,
      goal: 'CCVS Evidence Generation',
      timestamp: new Date().toISOString(),
      success: result.success,
      metrics: result.metrics,
      levels: result.levels,
      totalEvidence: result.totalEvidence,
      diffusionTrace: result.diffusionTrace
    };
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'evidence-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Write individual evidence items
    for (const evidence of result.totalEvidence) {
      const safeId = evidence.id.replace(/[^a-zA-Z0-9-_]/g, '_');
      await fs.writeFile(
        path.join(this.config.outputDir, `evidence-${safeId}.json`),
        JSON.stringify(evidence, null, 2)
      );
    }
    
    // Write diffusion trace
    await fs.writeFile(
      path.join(this.config.outputDir, 'diffusion-trace.json'),
      JSON.stringify(result.diffusionTrace, null, 2)
    );
    
    // Write log file
    await fs.writeFile(
      path.join(this.config.outputDir, 'pipeline.log'),
      `CCVS Evidence Generation Log\nCommit: ${result.commit}\nBranch: ${result.branchName}\nTimestamp: ${new Date().toISOString()}\nSuccess: ${result.success}\nEvidence Count: ${result.totalEvidence.length}\n`
    );
    
    this.log('Evidence files written to ' + this.config.outputDir);
  }

  private logSimulationResults(result: any): void {
    this.log('\n=== SIMULATION RESULTS ===');
    this.log('Overall Success: ' + (result.success ? 'YES' : 'NO'));
    this.log('Total Duration: ' + (result.metrics?.totalDurationMs || 0) + 'ms');
    this.log('Agents: ' + result.metrics?.successfulAgents + '/' + result.metrics?.totalAgents);
    this.log('Evidence Items: ' + result.metrics?.totalEvidence);
    
    if (result.levels) {
      for (const level of result.levels) {
        this.log('  ' + level.level + ': ' + (level.converged ? 'CONVERGED' : 'FAILED') + ' (score: ' + (level.score * 100).toFixed(1) + '%)');
        for (const agent of level.agents) {
          this.log('    ' + agent.agentId + ': ' + (agent.success ? 'PASS' : 'FAIL') + ' (' + agent.durationMs + 'ms)');
        }
      }
    }
    
    if (result.diffusionTrace) {
      this.log('\n  Diffusion Trace:');
      for (const trace of result.diffusionTrace) {
        this.log('    ' + trace.agent + ': ' + (trace.diffusionSteps?.length || 0) + ' iterations');
      }
    }
  }

  private logRealResults(result: any): void {
    this.log('\n=== REAL EXECUTION RESULTS ===');
    this.log('Overall Success: ' + (result.success ? 'YES' : 'NO'));
    this.log('Total Duration: ' + (result.metrics?.totalDurationMs || 0) + 'ms');
    this.log('Agents: ' + result.metrics?.successfulAgents + '/' + result.metrics?.totalAgents);
    this.log('Evidence Items: ' + result.metrics?.totalEvidence);
    this.log('PR Created: ' + (result.prUrl ? result.prUrl : 'NO'));
    
    if (result.levels) {
      for (const level of result.levels) {
        this.log('  ' + level.level + ': ' + (level.converged ? 'CONVERGED' : 'FAILED') + ' (score: ' + (level.score * 100).toFixed(1) + '%)');
      }
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log('[Pipeline] ' + new Date().toISOString() + ' ' + message);
    }
  }
}

export function createSimulationPipeline(config: Partial<{ 
  orchestrator: any; 
  github: any; 
  dryRun: boolean; 
  outputDir: string; 
  verbose: boolean 
}> = {}): SimulationPipeline {
  return new SimulationPipeline(config);
}

export async function runCCVSPipeline(
  commit: string,
  goal: string,
  options: any = {}
): Promise<any> {
  const pipeline = createSimulationPipeline(options);
  return pipeline.run(commit, goal);
}