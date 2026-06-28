/**
 * Spine Agent - Orchestration & DSG Governance
 *
 * Coordinates all agents, enforces DSG governance, maintains audit trail
 * Central nervous system of the 5-agent Trinity system
 */

import type {
  JobListing,
  AgentProfile,
  JobExecution,
  MarketplaceData,
} from '../../examples/solana-job-platform/solana_job_marketplace';
import { mindAgent } from './mind-agent';
import { handAgent } from './hand-agent';
import { eyeAgent } from './eye-agent';
import { nerveAgent } from './nerve-agent';

interface ExecutionPlan {
  jobId: string;
  agentId: string;
  timestamp: string;
  planHash: string;
  steps: ExecutionStep[];
  governance: GovernanceCheckResult;
}

interface ExecutionStep {
  step: number;
  agent: string;
  action: string;
  expectedOutcome: string;
}

interface GovernanceCheckResult {
  approved: boolean;
  policyVersion: string;
  constraints: PolicyConstraint[];
  violations: string[];
}

interface PolicyConstraint {
  name: string;
  required: boolean;
  satisfied: boolean;
}

interface ExecutionTrace {
  planHash: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'partial' | 'failed';
  steps: ExecutionStepResult[];
  auditHash: string;
}

interface ExecutionStepResult {
  step: number;
  agent: string;
  status: 'success' | 'failed';
  result?: string;
  error?: string;
  timestamp: string;
}

/**
 * Spine Agent - Central orchestrator and governance enforcer
 */
export class SpineAgent {
  private agentName = 'Spine Agent';
  private readonly POLICY_VERSION = '1.0';
  private auditTrail: ExecutionTrace[] = [];

  /**
   * Create execution plan for a job
   */
  async planExecution(job: JobListing, profile: AgentProfile): Promise<ExecutionPlan> {
    console.log(`\n[${this.agentName}] Planning execution for: ${job.title}`);

    const steps: ExecutionStep[] = [
      {
        step: 1,
        agent: 'Mind',
        action: 'Validate job requirements and agent qualifications',
        expectedOutcome: 'Job is suitable for agent skill level',
      },
      {
        step: 2,
        agent: 'Hand',
        action: 'Execute work and generate deliverable',
        expectedOutcome: 'Deliverable with quality score and proof hash',
      },
      {
        step: 3,
        agent: 'Eye',
        action: 'Verify deliverable quality and transaction validity',
        expectedOutcome: 'Deliverable approved for payment',
      },
      {
        step: 4,
        agent: 'Nerve',
        action: 'Settle payment and update reputation',
        expectedOutcome: 'Payment sent, reputation updated, tier evaluated',
      },
    ];

    // Run governance checks
    const governance = this.evaluateGovernance(job, profile);

    // Create plan hash
    const planHash = this.createPlanHash(job, profile, steps);

    const plan: ExecutionPlan = {
      jobId: job.id,
      agentId: profile.agentId,
      timestamp: new Date().toISOString(),
      planHash,
      steps,
      governance,
    };

    console.log(`[${this.agentName}] Plan created: ${planHash.substring(0, 20)}...`);
    console.log(`[${this.agentName}] Governance: ${governance.approved ? '✅ APPROVED' : '❌ BLOCKED'}`);

    return plan;
  }

  /**
   * Execute orchestrated workflow
   */
  async executeWorkflow(
    plan: ExecutionPlan,
    job: JobListing,
    profile: AgentProfile,
    data: MarketplaceData,
  ): Promise<ExecutionTrace> {
    const startTime = new Date().toISOString();
    const stepResults: ExecutionStepResult[] = [];

    console.log(`\n[${this.agentName}] 🚀 Starting workflow execution`);
    console.log(`[${this.agentName}] Plan: ${plan.planHash.substring(0, 20)}...`);

    // Step 1: Mind Agent validates
    try {
      console.log(`[${this.agentName}] Step 1: Mind Agent validation...`);
      const isValid = job.reward.amount > 0 && profile.skills.length > 0;
      stepResults.push({
        step: 1,
        agent: 'Mind',
        status: isValid ? 'success' : 'failed',
        result: isValid ? 'Job validation passed' : undefined,
        error: isValid ? undefined : 'Job or agent invalid',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      stepResults.push({
        step: 1,
        agent: 'Mind',
        status: 'failed',
        error: String(err),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Hand Agent executes
    let execution: JobExecution | null = null;
    try {
      console.log(`[${this.agentName}] Step 2: Hand Agent execution...`);
      const result = await handAgent.executeJob(job);

      execution = {
        jobId: job.id,
        agentId: profile.agentId,
        startedAt: new Date().toISOString(),
        deliverable: result.deliverable,
        proofHash: result.proofHash,
        qualityScore: result.qualityScore,
        status: 'submitted',
      };

      stepResults.push({
        step: 2,
        agent: 'Hand',
        status: 'success',
        result: `Deliverable created, quality: ${result.qualityScore}/100`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      stepResults.push({
        step: 2,
        agent: 'Hand',
        status: 'failed',
        error: String(err),
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Eye Agent verifies
    let paymentApproved = false;
    if (execution) {
      try {
        console.log(`[${this.agentName}] Step 3: Eye Agent verification...`);
        const verification = await eyeAgent.verifyExecution(execution, 70);
        paymentApproved = verification.passed;

        execution.status = verification.passed ? 'verified' : 'failed';
        execution.completedAt = new Date().toISOString();

        stepResults.push({
          step: 3,
          agent: 'Eye',
          status: verification.passed ? 'success' : 'failed',
          result: verification.passed ? 'Verification passed' : `Issues: ${verification.issues.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        stepResults.push({
          step: 3,
          agent: 'Eye',
          status: 'failed',
          error: String(err),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Step 4: Nerve Agent pays
    if (paymentApproved && execution) {
      try {
        console.log(`[${this.agentName}] Step 4: Nerve Agent payment...`);
        const paymentResult = await nerveAgent.settlePayment(job, profile);

        if (paymentResult.success) {
          execution.txSignature = paymentResult.txSignature;
          execution.status = 'paid';

          // Update reputation
          nerveAgent.updateReputation(profile, execution.qualityScore!, true);
          profile.completedJobs += 1;
          profile.totalEarnings += paymentResult.amount;
          profile.lastActive = new Date().toISOString();

          stepResults.push({
            step: 4,
            agent: 'Nerve',
            status: 'success',
            result: `Payment: ${paymentResult.amount} SOL, TX: ${paymentResult.txSignature?.substring(0, 20)}...`,
            timestamp: new Date().toISOString(),
          });

          // Save execution
          data.executions.push(execution);
        } else {
          stepResults.push({
            step: 4,
            agent: 'Nerve',
            status: 'failed',
            error: paymentResult.error || 'Payment failed',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        stepResults.push({
          step: 4,
          agent: 'Nerve',
          status: 'failed',
          error: String(err),
          timestamp: new Date().toISOString(),
        });
      }
    }

    const endTime = new Date().toISOString();
    const status = stepResults.every((s) => s.status === 'success')
      ? 'success'
      : stepResults.some((s) => s.status === 'success')
        ? 'partial'
        : 'failed';

    const trace: ExecutionTrace = {
      planHash: plan.planHash,
      startTime,
      endTime,
      status,
      steps: stepResults,
      auditHash: this.createAuditHash(plan.planHash, stepResults),
    };

    this.auditTrail.push(trace);

    console.log(`\n[${this.agentName}] ✅ Workflow complete: ${status.toUpperCase()}`);
    console.log(`[${this.agentName}] Audit hash: ${trace.auditHash.substring(0, 20)}...`);

    return trace;
  }

  /**
   * Evaluate DSG governance policies
   */
  private evaluateGovernance(job: JobListing, profile: AgentProfile): GovernanceCheckResult {
    const constraints: PolicyConstraint[] = [
      {
        name: 'Agent Active',
        required: true,
        satisfied: profile.reputation > 0,
      },
      {
        name: 'Job Amount Valid',
        required: true,
        satisfied: job.reward.amount > 0 && job.reward.amount < 100000,
      },
      {
        name: 'Deadline Valid',
        required: true,
        satisfied: new Date(job.deadline) > new Date(),
      },
      {
        name: 'Agent Qualified',
        required: true,
        satisfied: profile.skills.length > 0,
      },
      {
        name: 'No Sanctions',
        required: true,
        satisfied: profile.reputation >= 0,
      },
    ];

    const violations = constraints
      .filter((c) => c.required && !c.satisfied)
      .map((c) => c.name);

    return {
      approved: violations.length === 0,
      policyVersion: this.POLICY_VERSION,
      constraints,
      violations,
    };
  }

  /**
   * Create deterministic plan hash
   */
  private createPlanHash(job: JobListing, profile: AgentProfile, steps: ExecutionStep[]): string {
    const content = `${job.id}:${profile.agentId}:${steps.map((s) => s.action).join('|')}`;
    return require('crypto').createHash('sha256').update(content).digest('hex').substring(0, 44);
  }

  /**
   * Create audit hash for execution trace
   */
  private createAuditHash(planHash: string, results: ExecutionStepResult[]): string {
    const content = `${planHash}:${results.map((r) => `${r.agent}:${r.status}`).join('|')}`;
    return require('crypto').createHash('sha256').update(content).digest('hex').substring(0, 44);
  }

  /**
   * Get audit trail summary
   */
  getAuditSummary(): {
    totalExecutions: number;
    successful: number;
    partial: number;
    failed: number;
  } {
    const total = this.auditTrail.length;
    const successful = this.auditTrail.filter((t) => t.status === 'success').length;
    const partial = this.auditTrail.filter((t) => t.status === 'partial').length;
    const failed = this.auditTrail.filter((t) => t.status === 'failed').length;

    return {
      totalExecutions: total,
      successful,
      partial,
      failed,
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 10): ExecutionTrace[] {
    return this.auditTrail.slice(-limit);
  }
}

/**
 * Singleton Spine Agent instance
 */
export const spineAgent = new SpineAgent();

/**
 * Export orchestration functions
 */
export async function planAndExecute(
  job: JobListing,
  profile: AgentProfile,
  data: MarketplaceData,
): Promise<{ plan: ExecutionPlan; trace: ExecutionTrace }> {
  const plan = await spineAgent.planExecution(job, profile);

  if (!plan.governance.approved) {
    console.error('[Spine] Governance checks failed, execution blocked');
    throw new Error(`Governance violations: ${plan.governance.violations.join(', ')}`);
  }

  const trace = await spineAgent.executeWorkflow(plan, job, profile, data);
  return { plan, trace };
}
