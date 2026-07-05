/**
 * Executive Agent Hierarchy — DSG Agent OS
 *
 * CEO/COO/CTO agent hierarchy with DSG Gate integration.
 * Each executive agent coordinates specialist agents via the registry and event bus.
 * All decisions go through DSG Gate before execution.
 */

import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';
import { agentRegistry, type AgentInstance, type AgentCapability, type AgentStatus } from './registry';
import { eventBus, type Event, type EventPriority } from './event-bus';
import { sharedMemory, type MemoryEntry, type MemoryType } from './memory';
import { multiModelRouter, type ModelCapability, type RoutingDecision } from './router';

export type ExecutiveRole = 'ceo' | 'coo' | 'cto';

export interface ExecutiveAgent extends AgentInstance {
  executiveRole: ExecutiveRole;
  departmentAgents: string[]; // IDs of managed agents
  authorityLevel: number; // 100=CEO, 80=COO, 60=CTO
  decisionThreshold: number; // minimum confidence for autonomous decisions
}

export interface DepartmentAgent extends AgentInstance {
  executiveId: string; // ID of managing executive
  specialization: string;
}

export interface ExecutiveDecision {
  id: string;
  executiveId: string;
  executiveRole: ExecutiveRole;
  type: 'strategic' | 'operational' | 'technical' | 'resource_allocation' | 'risk_approval';
  title: string;
  description: string;
  options: DecisionOption[];
  selectedOption?: string;
  confidence: number; // 0-1
  requiresGateApproval: boolean;
  gateDecision?: 'ALLOW' | 'BLOCK' | 'REVIEW';
  evidenceHash: string;
  createdAt: string;
  executedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'blocked';
}

export interface DecisionOption {
  id: string;
  description: string;
  estimatedCost: number;
  estimatedTimeHours: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  pros: string[];
  cons: string[];
  requiredApprovals: string[]; // roles that must approve
}

export interface GateCheckRequest {
  actionId: string;
  agentType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
}

export interface GateCheckResult {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  z3ProofHash: string;
  reason: string;
  conditions?: string[];
}

class ExecutiveHierarchy {
  private executives = new Map<string, ExecutiveAgent>();
  private decisions = new Map<string, ExecutiveDecision>();
  private gateEndpoint = '/api/dsg/agents/security-gate';

  constructor() {
    this.initializeExecutives();
  }

  /**
   * Initialize the three executive agents.
   */
  private initializeExecutives(): void {
    // CEO - Strategic leadership
    const ceo = agentRegistry.register({
      name: 'CEO Agent',
      role: 'executive',
      description: 'Chief Executive Agent - Strategic direction, resource allocation, risk approval',
      capabilities: ['orchestration', 'planning', 'verification', 'summarization'],
      model: 'anthropic/claude-3.5-sonnet',
      maxConcurrency: 2,
    });

    const executiveCeo: ExecutiveAgent = {
      ...ceo,
      executiveRole: 'ceo',
      departmentAgents: [],
      authorityLevel: 100,
      decisionThreshold: 0.85,
    };
    this.executives.set(ceo.id, executiveCeo);

    // COO - Operations
    const coo = agentRegistry.register({
      name: 'COO Agent',
      role: 'executive',
      description: 'Chief Operating Agent - Daily operations, execution monitoring, delivery',
      capabilities: ['orchestration', 'execution', 'monitoring', 'verification'],
      model: 'openai/gpt-4o',
      maxConcurrency: 3,
    });

    const executiveCoo: ExecutiveAgent = {
      ...coo,
      executiveRole: 'coo',
      departmentAgents: [],
      authorityLevel: 80,
      decisionThreshold: 0.8,
    };
    this.executives.set(coo.id, executiveCoo);

    // CTO - Technology
    const cto = agentRegistry.register({
      name: 'CTO Agent',
      role: 'executive',
      description: 'Chief Technology Agent - Architecture, technical standards, code quality',
      capabilities: ['coding', 'review', 'verification', 'planning'],
      model: 'google/gemini-1.5-pro',
      maxConcurrency: 3,
    });

    const executiveCto: ExecutiveAgent = {
      ...cto,
      executiveRole: 'cto',
      departmentAgents: [],
      authorityLevel: 60,
      decisionThreshold: 0.75,
    };
    this.executives.set(cto.id, executiveCto);

    // Subscribe to events for coordination
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for executive coordination.
   */
  private setupEventHandlers(): void {
    eventBus.subscribe({
      agentId: 'executive-hierarchy',
      eventTypes: ['task.completed', 'task.failed', 'agent.status.changed', 'decision.requested'],
      handler: async (event) => {
        await this.handleEvent(event);
      },
    });
  }

  /**
   * Handle incoming events.
   */
  private async handleEvent(event: Event): Promise<void> {
    switch (event.type) {
      case 'task.completed':
        await this.onTaskCompleted(event.payload as { agentId: string; taskId: string; evidenceHash: string });
        break;
      case 'task.failed':
        await this.onTaskFailed(event.payload as { agentId: string; taskId: string; error: string });
        break;
      case 'agent.status.changed':
        await this.onAgentStatusChanged(event.payload as { agentId: string; oldStatus: AgentStatus; newStatus: AgentStatus });
        break;
      case 'decision.requested':
        await this.onDecisionRequested(event.payload as { executiveRole: ExecutiveRole; decision: ExecutiveDecision });
        break;
    }
  }

  private async onTaskCompleted(payload: { agentId: string; taskId: string; evidenceHash: string }): Promise<void> {
    // Notify managing executive
    const executive = this.findExecutiveForAgent(payload.agentId);
    if (executive) {
      await eventBus.publish({
        type: 'executive.task.completed',
        sourceAgentId: 'executive-hierarchy',
        targetAgentId: executive.id,
        payload,
        priority: 'normal',
      });
    }
  }

  private async onTaskFailed(payload: { agentId: string; taskId: string; error: string }): Promise<void> {
    const executive = this.findExecutiveForAgent(payload.agentId);
    if (executive) {
      await eventBus.publish({
        type: 'executive.task.failed',
        sourceAgentId: 'executive-hierarchy',
        targetAgentId: executive.id,
        payload,
        priority: 'high',
      });
    }
  }

  private async onAgentStatusChanged(payload: { agentId: string; oldStatus: AgentStatus; newStatus: AgentStatus }): Promise<void> {
    // Log to memory for audit trail
    await sharedMemory.store({
      agentId: 'executive-hierarchy',
      type: 'episodic',
      content: { event: 'agent_status_changed', ...payload },
      tags: ['audit', 'agent-lifecycle'],
      importance: 0.6,
    });
  }

  private async onDecisionRequested(payload: { executiveRole: ExecutiveRole; decision: ExecutiveDecision }): Promise<void> {
    const executive = this.getExecutiveByRole(payload.executiveRole);
    if (executive) {
      // Route to executive for processing
      await eventBus.publish({
        type: 'executive.decision.process',
        sourceAgentId: 'executive-hierarchy',
        targetAgentId: executive.id,
        payload: payload.decision,
        priority: 'high',
      });
    }
  }

  /**
   * Find executive managing a given agent.
   */
  private findExecutiveForAgent(agentId: string): ExecutiveAgent | undefined {
    for (const executive of this.executives.values()) {
      if (executive.departmentAgents.includes(agentId)) {
        return executive;
      }
    }
    return undefined;
  }

  /**
   * Get executive by role.
   */
  getExecutiveByRole(role: ExecutiveRole): ExecutiveAgent | undefined {
    for (const executive of this.executives.values()) {
      if (executive.executiveRole === role) return executive;
    }
    return undefined;
  }

  /**
   * Get all executives.
   */
  getExecutives(): ExecutiveAgent[] {
    return Array.from(this.executives.values());
  }

  /**
   * Assign a department agent to an executive.
   */
  assignToExecutive(executiveRole: ExecutiveRole, agentId: string): { ok: boolean; error?: string } {
    const executive = this.getExecutiveByRole(executiveRole);
    if (!executive) {
      return { ok: false, error: `Executive ${executiveRole} not found` };
    }

    const agent = agentRegistry.get(agentId);
    if (!agent) {
      return { ok: false, error: 'Agent not found' };
    }

    if (executive.departmentAgents.includes(agentId)) {
      return { ok: true }; // already assigned
    }

    executive.departmentAgents.push(agentId);

    // Store assignment in memory
    sharedMemory.store({
      agentId: executive.id,
      type: 'semantic',
      content: { action: 'agent_assigned', executiveRole, agentId },
      tags: ['organization', 'assignment'],
      importance: 0.7,
    });

    return { ok: true };
  }

  /**
   * Create a new decision requiring executive approval.
   */
  async createDecision(input: {
    executiveRole: ExecutiveRole;
    type: ExecutiveDecision['type'];
    title: string;
    description: string;
    options: DecisionOption[];
    requiresGateApproval?: boolean;
  }): Promise<ExecutiveDecision> {
    const executive = this.getExecutiveByRole(input.executiveRole);
    if (!executive) {
      throw new Error(`Executive ${input.executiveRole} not found`);
    }

    const decisionId = `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const decision: ExecutiveDecision = {
      id: decisionId,
      executiveId: executive.id,
      executiveRole: input.executiveRole,
      type: input.type,
      title: input.title,
      description: input.description,
      options: input.options,
      confidence: 0,
      requiresGateApproval: input.requiresGateApproval ?? true,
      evidenceHash: '',
      createdAt: now,
      status: 'pending',
    };

    decision.evidenceHash = this.computeDecisionHash(decision);
    this.decisions.set(decisionId, decision);

    // Store in memory
    await sharedMemory.store({
      agentId: executive.id,
      type: 'episodic',
      content: { action: 'decision_created', decision },
      tags: ['decision', 'governance'],
      importance: 0.8,
    });

    // Request gate approval if required
    if (decision.requiresGateApproval) {
      await this.requestGateApproval(decision);
    }

    return decision;
  }

  /**
   * Request DSG Gate approval for a decision.
   */
  private async requestGateApproval(decision: ExecutiveDecision): Promise<void> {
    try {
      const response = await fetch(this.gateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: decision.id,
          agentType: `executive_${decision.executiveRole}`,
          riskLevel: this.mapDecisionTypeToRisk(decision.type),
          description: decision.description,
          evidence: [decision.evidenceHash],
        } as GateCheckRequest),
      });

      const result = await response.json() as GateCheckResult;
      decision.gateDecision = result.decision;
      decision.z3ProofHash = result.z3ProofHash;

      if (result.decision === 'ALLOW') {
        decision.status = 'approved';
      } else if (result.decision === 'BLOCK') {
        decision.status = 'blocked';
      } else {
        decision.status = 'pending'; // REVIEW
      }

      // Update evidence hash with gate result
      decision.evidenceHash = this.computeDecisionHash(decision);

      // Store updated decision
      this.decisions.set(decision.id, decision);

      await sharedMemory.store({
        agentId: decision.executiveId,
        type: 'episodic',
        content: { action: 'gate_decision', decision, gateResult: result },
        tags: ['decision', 'gate', 'governance'],
        importance: 0.9,
      });

      // Emit event
      await eventBus.publish({
        type: 'executive.decision.gate_result',
        sourceAgentId: 'executive-hierarchy',
        targetAgentId: decision.executiveId,
        payload: { decision, gateResult: result },
        priority: 'high',
      });
    } catch (error) {
      console.error('[ExecutiveHierarchy] Gate request failed:', error);
      decision.gateDecision = 'BLOCK';
      decision.status = 'blocked';
      decision.evidenceHash = this.computeDecisionHash(decision);
    }
  }

  /**
   * Execute an approved decision.
   */
  async executeDecision(decisionId: string): Promise<{ ok: boolean; error?: string }> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return { ok: false, error: 'Decision not found' };
    }

    if (decision.status !== 'approved') {
      return { ok: false, error: `Decision not approved (status: ${decision.status})` };
    }

    // Delegate execution to appropriate department agents
    const executive = this.executives.get(decision.executiveId);
    if (!executive) {
      return { ok: false, error: 'Executive not found' };
    }

    // Create tasks for department agents
    for (const agentId of executive.departmentAgents) {
      await eventBus.publish({
        type: 'executive.decision.execute',
        sourceAgentId: executive.id,
        targetAgentId: agentId,
        payload: { decisionId, decision },
        priority: 'high',
        correlationId: decisionId,
      });
    }

    decision.status = 'executed';
    decision.executedAt = new Date().toISOString();
    decision.evidenceHash = this.computeDecisionHash(decision);

    this.decisions.set(decisionId, decision);

    await sharedMemory.store({
      agentId: executive.id,
      type: 'episodic',
      content: { action: 'decision_executed', decision },
      tags: ['decision', 'execution', 'governance'],
      importance: 0.9,
    });

    return { ok: true };
  }

  /**
   * Get decision by ID.
   */
  getDecision(decisionId: string): ExecutiveDecision | undefined {
    return this.decisions.get(decisionId);
  }

  /**
   * List decisions for an executive.
   */
  listDecisions(executiveRole?: ExecutiveRole): ExecutiveDecision[] {
    let decisions = Array.from(this.decisions.values());

    if (executiveRole) {
      decisions = decisions.filter((d) => d.executiveRole === executiveRole);
    }

    return decisions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Get organization stats.
   */
  getOrgStats(): {
    executives: number;
    totalAgents: number;
    agentsByExecutive: Record<ExecutiveRole, number>;
    decisionsPending: number;
    decisionsApproved: number;
    decisionsExecuted: number;
    decisionsBlocked: number;
  } {
    const agentsByExecutive: Record<ExecutiveRole, number> = { ceo: 0, coo: 0, cto: 0 };
    let totalAgents = 0;

    for (const executive of this.executives.values()) {
      agentsByExecutive[executive.executiveRole] = executive.departmentAgents.length;
      totalAgents += executive.departmentAgents.length;
    }

    const decisions = Array.from(this.decisions.values());
    const decisionsPending = decisions.filter((d) => d.status === 'pending').length;
    const decisionsApproved = decisions.filter((d) => d.status === 'approved').length;
    const decisionsExecuted = decisions.filter((d) => d.status === 'executed').length;
    const decisionsBlocked = decisions.filter((d) => d.status === 'blocked').length;

    return {
      executives: this.executives.size,
      totalAgents,
      agentsByExecutive,
      decisionsPending,
      decisionsApproved,
      decisionsExecuted,
      decisionsBlocked,
    };
  }

  /**
   * Delegate a task to the best available agent in the organization.
   */
  async delegateTask(input: {
    taskType: ModelCapability;
    description: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    maxCostUsd?: number;
    maxLatencyMs?: number;
    requiredCapabilities?: ModelCapability[];
    preferredExecutive?: ExecutiveRole;
  }): Promise<{ agentId: string; routingDecision: RoutingDecision }> {
    // Determine which executive should handle this
    let executive: ExecutiveAgent;
    if (input.preferredExecutive) {
      executive = this.getExecutiveByRole(input.preferredExecutive)!;
    } else {
      // Route by task type
      if (['coding', 'review'].includes(input.taskType)) {
        executive = this.getExecutiveByRole('cto')!;
      } else if (['execution', 'monitoring'].includes(input.taskType)) {
        executive = this.getExecutiveByRole('coo')!;
      } else {
        executive = this.getExecutiveByRole('ceo')!;
      }
    }

    // Find best available agent in executive's department
    const availableAgents = executive.departmentAgents
      .map((id) => agentRegistry.get(id))
      .filter((a): a is AgentInstance => a !== undefined && (a.status === 'idle' || a.status === 'active'));

    if (availableAgents.length === 0) {
      // Fall back to any available agent in registry
      const allAvailable = agentRegistry.getAvailable(input.taskType);
      if (allAvailable.length === 0) {
        throw new Error('No available agents for task');
      }
      // Route via multi-model router
      const routingDecision = await multiModelRouter.route({
        agentId: allAvailable[0].id,
        taskType: input.taskType,
        estimatedInputTokens: input.estimatedInputTokens,
        estimatedOutputTokens: input.estimatedOutputTokens,
        maxCostUsd: input.maxCostUsd,
        maxLatencyMs: input.maxLatencyMs,
        requiredCapabilities: input.requiredCapabilities,
      });
      return { agentId: allAvailable[0].id, routingDecision };
    }

    // Select agent with matching capabilities
    const capableAgents = availableAgents.filter((a) => a.capabilities.includes(input.taskType));
    const targetAgent = capableAgents.length > 0 ? capableAgents[0] : availableAgents[0];

    // Get routing decision for model selection
    const routingDecision = await multiModelRouter.route({
      agentId: targetAgent.id,
      taskType: input.taskType,
      estimatedInputTokens: input.estimatedInputTokens,
      estimatedOutputTokens: input.estimatedOutputTokens,
      maxCostUsd: input.maxCostUsd,
      maxLatencyMs: input.maxLatencyMs,
      requiredCapabilities: input.requiredCapabilities,
    });

    // Assign task to agent
    const assignResult = agentRegistry.assignTask(targetAgent.id, `task-${Date.now()}`);
    if (!assignResult.ok) {
      throw new Error(`Failed to assign task: ${assignResult.error}`);
    }

    return { agentId: targetAgent.id, routingDecision };
  }

  // ===== Private Helpers =====

  private mapDecisionTypeToRisk(type: ExecutiveDecision['type']): GateCheckRequest['riskLevel'] {
    switch (type) {
      case 'strategic':
      case 'risk_approval':
        return 'critical';
      case 'resource_allocation':
        return 'high';
      case 'operational':
        return 'medium';
      case 'technical':
        return 'medium';
      default:
        return 'medium';
    }
  }

  private computeDecisionHash(decision: ExecutiveDecision): string {
    return sha256Json({
      id: decision.id,
      executiveId: decision.executiveId,
      executiveRole: decision.executiveRole,
      type: decision.type,
      title: decision.title,
      description: decision.description,
      options: decision.options.map((o) => o.id).sort(),
      selectedOption: decision.selectedOption ?? null,
      confidence: decision.confidence,
      requiresGateApproval: decision.requiresGateApproval,
      gateDecision: decision.gateDecision ?? null,
      status: decision.status,
      createdAt: decision.createdAt,
      executedAt: decision.executedAt ?? null,
      version: 'executive-decision-v1',
    });
  }
}

// Singleton instance
export const executiveHierarchy = new ExecutiveHierarchy();

/**
 * Convenience: get CEO agent
export function getCEO(): ExecutiveAgent | undefined {
  return executiveHierarchy.getExecutiveByRole('ceo');
}

/**
 * Convenience: get COO agent
export function getCOO(): ExecutiveAgent | undefined {
  return executiveHierarchy.getExecutiveByRole('coo');
}

/**
 * Convenience: get CTO agent
export function getCTO(): ExecutiveAgent | undefined {
  return executiveHierarchy.getExecutiveByRole('cto');
}