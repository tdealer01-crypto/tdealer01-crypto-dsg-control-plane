// Diffusion-enabled Base Agent with internal converge loop
import { BaseAgent, AgentContext, AgentResult, EvidenceItem, VerificationSpec } from './base-agent';

export interface DiffusionConfig {
  maxIterations: number;
  convergenceThreshold: number;
  diffusionSteps: number;
  enableRepair: boolean;
}

export interface DiffusionStep {
  iteration: number;
  draft: any;
  verification: VerificationResult[];
  repair?: RepairAction[];
  converged: boolean;
  score: number;
}

export interface VerificationResult {
  check: string;
  passed: boolean;
  score: number;
  threshold: number;
  details: string;
}

export interface RepairAction {
  target: string;
  action: 'add' | 'modify' | 'remove';
  reason: string;
  diff: string;
}

export abstract class DiffusionAgent extends BaseAgent {
  protected diffusionConfig: DiffusionConfig = {
    maxIterations: 4,
    convergenceThreshold: 0.95,
    diffusionSteps: 8,
    enableRepair: true
  };

  protected diffusionSteps: DiffusionStep[] = [];

  async run(context: AgentContext): Promise<Omit<AgentResult, 'agentId' | 'level' | 'durationMs'>> {
    this.diffusionSteps = [];
    
    // DIFFUSION LOOP: Draft → Verify → Repair → Converge
    for (let iteration = 0; iteration < this.diffusionConfig.maxIterations; iteration++) {
      // 1. DRAFT (parallel generation)
      const draft = await this.draft(context, iteration);
      
      // 2. VERIFY (batch parallel checks)
      const verification = await this.verify(draft, context);
      
      // 3. CHECK CONVERGENCE
      const score = this.computeConvergenceScore(verification);
      const converged = score >= this.diffusionConfig.convergenceThreshold;
      
      this.diffusionSteps.push({
        iteration: iteration + 1,
        draft,
        verification,
        converged,
        score
      });

      if (converged) {
        return this.finalize(draft, verification);
      }

      // 4. REPAIR (if enabled and not last iteration)
      if (this.diffusionConfig.enableRepair && iteration < this.diffusionConfig.maxIterations - 1) {
        const repair = await this.repair(draft, verification, context);
        this.diffusionSteps[this.diffusionSteps.length - 1].repair = repair;
        // Apply repair to context for next iteration
        context = this.applyRepair(context, repair);
      }
    }

    // Max iterations reached - return best effort
    const finalDraft = this.diffusionSteps[this.diffusionSteps.length - 1].draft;
    const finalVerification = await this.verify(finalDraft, context);
    return this.finalize(finalDraft, finalVerification);
  }

  // Abstract methods each agent must implement
  protected abstract draft(context: AgentContext, iteration: number): Promise<any>;
  protected abstract verify(draft: any, context: AgentContext): Promise<VerificationResult[]>;
  protected abstract repair(draft: any, verification: VerificationResult[], context: AgentContext): Promise<RepairAction[]>;
  protected abstract finalize(draft: any, verification: VerificationResult[]): Omit<AgentResult, 'agentId' | 'level' | 'durationMs'>;

  protected computeConvergenceScore(verification: VerificationResult[]): number {
    if (verification.length === 0) return 1;
    const passed = verification.filter(v => v.passed).length;
    const avgScore = verification.reduce((sum, v) => sum + v.score, 0) / verification.length;
    return (passed / verification.length) * 0.7 + avgScore * 0.3;
  }

  protected applyRepair(context: AgentContext, repairs: RepairAction[]): AgentContext {
    // Return modified context for next iteration
    return context;
  }
}