// Base Agent Interface for CCVS Multi-Agent System

export interface AgentContext {
  commit: string;
  repoPath: string;
  branchName: string;
  githubToken: string;
  repoOwner: string;
  repoName: string;
  simulationMode: boolean;
  diffusionEndpoint?: string;
  diffusionApiKey?: string;
}

export interface AgentResult {
  agentId: string;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  success: boolean;
  evidence: EvidenceItem[];
  metrics: Record<string, any>;
  errors: string[];
  warnings: string[];
  durationMs: number;
  simulationTrace?: any[];
}

export interface EvidenceItem {
  id: string;
  type: 'test' | 'proof' | 'artifact' | 'attestation' | 'report';
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  name: string;
  description: string;
  path?: string;           // File path in repo
  content?: string;        // Content for new files
  hash?: string;           // SHA256
  command?: string;        // Command to generate
  verification?: VerificationSpec;
}

export interface VerificationSpec {
  type: 'mutation' | 'z3' | 'integration' | 'adversarial' | 'provenance' | 'signature';
  command?: string;
  expectedResult: any;
  threshold?: number;
}

export interface Agent {
  id: string;
  name: string;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  parallelGroup: string;
  dependsOn: string[];
  execute(context: AgentContext): Promise<AgentResult>;
  simulate(context: AgentContext): Promise<AgentResult>;
  validate(result: AgentResult): boolean;
}

// Abstract base class
export abstract class BaseAgent implements Agent {
  abstract id: string;
  abstract name: string;
  abstract level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  abstract parallelGroup: string;
  abstract dependsOn: string[];

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const result = await this.run(context);
      return {
        ...result,
        agentId: this.id,
        level: this.level,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        agentId: this.id,
        level: this.level,
        success: false,
        evidence: [],
        metrics: {},
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        durationMs: Date.now() - startTime
      };
    }
  }

  async simulate(context: AgentContext): Promise<AgentResult> {
    const simContext = { ...context, simulationMode: true };
    return this.execute(simContext);
  }

  abstract run(context: AgentContext): Promise<Omit<AgentResult, 'agentId' | 'level' | 'durationMs'>>;

  validate(result: AgentResult): boolean {
    return result.success && result.errors.length === 0;
  }

  protected async runCommand(cmd: string, cwd?: string): Promise<{stdout: string; stderr: string; exitCode: number}> {
    // In real implementation, use child_process or SSH
    // In simulation, return mock result
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  protected computeHash(content: string): string {
    // In real implementation, use crypto.subtle.digest
    return 'sha256:' + Buffer.from(content).toString('base64').slice(0, 32);
  }
}