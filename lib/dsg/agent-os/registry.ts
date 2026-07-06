import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export type AgentCapability = string;
export type AgentStatus = 'active' | 'idle' | 'busy' | 'stopping' | 'stopped' | 'registering';

export interface RegistrationInput {
  name: string;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  model: string;
  maxConcurrency?: number;
}

export interface AgentInstance {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  model: string;
  maxConcurrency: number;
  status: AgentStatus;
  currentTaskId?: string;
  tasksCompleted: number;
  evidenceHashes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssignTaskResult {
  ok: boolean;
  error?: string;
}

export interface CompleteTaskResult {
  ok: boolean;
  error?: string;
}

export interface UnregisterResult {
  ok: boolean;
  error?: string;
}

export interface UpdateStatusResult {
  ok: boolean;
  error?: string;
}

export interface EvidenceVerification {
  valid: boolean;
  errors: string[];
}

export interface RegistryStats {
  total: number;
  byStatus: Record<AgentStatus, number>;
  byRole: Record<string, number>;
  totalTasksCompleted: number;
}

class AgentRegistry {
  private agents = new Map<string, AgentInstance>();
  private counter = 0;
  private evidenceChain: string[] = [];

  register(input: RegistrationInput): AgentInstance {
    this.counter++;
    const id = `agent-${input.role}-${this.counter.toString(36)}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const agent: AgentInstance = {
      id,
      name: input.name,
      role: input.role,
      description: input.description,
      capabilities: [...input.capabilities],
      model: input.model,
      maxConcurrency: input.maxConcurrency ?? 1,
      status: 'active',
      tasksCompleted: 0,
      evidenceHashes: [],
      createdAt: now,
      updatedAt: now,
    };

    // Generate registration evidence hash
    const evidenceHash = sha256Json({
      type: 'agent_registration',
      agentId: id,
      name: agent.name,
      role: agent.role,
      capabilities: [...agent.capabilities].sort(),
      model: agent.model,
      createdAt: agent.createdAt,
      version: 'agent-registration-v1',
    });

    agent.evidenceHashes.push(evidenceHash);
    this.evidenceChain.push(evidenceHash);
    this.agents.set(id, agent);

    return agent;
  }

  get(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  updateStatus(id: string, status: AgentStatus): UpdateStatusResult {
    const agent = this.agents.get(id);
    if (!agent) {
      return { ok: false, error: 'Agent not found' };
    }

    // Validate status transitions
    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      active: ['idle', 'busy', 'stopping'],
      idle: ['active', 'busy', 'stopping', 'stopped'],
      busy: ['idle', 'stopping'],
      stopping: ['stopped'],
      stopped: ['active'], // restart
      registering: ['active'],
    };

    const allowed = validTransitions[agent.status] || [];
    if (!allowed.includes(status)) {
      return { ok: false, error: `Invalid transition from ${agent.status} to ${status}` };
    }

    const oldStatus = agent.status;
    agent.status = status;
    agent.updatedAt = new Date().toISOString();

    // Add evidence hash for status change
    const evidenceHash = sha256Json({
      type: 'agent_status_change',
      agentId: id,
      oldStatus,
      newStatus: status,
      timestamp: agent.updatedAt,
      version: 'agent-status-change-v1',
    });

    agent.evidenceHashes.push(evidenceHash);
    this.evidenceChain.push(evidenceHash);

    return { ok: true };
  }

  assignTask(id: string, taskId: string): AssignTaskResult {
    const agent = this.agents.get(id);
    if (!agent) {
      return { ok: false, error: 'Agent not found' };
    }

    if (agent.status === 'busy') {
      return { ok: false, error: 'Agent is busy' };
    }

    agent.currentTaskId = taskId;
    agent.status = 'busy';
    agent.updatedAt = new Date().toISOString();

    const evidenceHash = sha256Json({
      type: 'task_assigned',
      agentId: id,
      taskId,
      timestamp: agent.updatedAt,
      version: 'task-assigned-v1',
    });

    agent.evidenceHashes.push(evidenceHash);
    this.evidenceChain.push(evidenceHash);

    return { ok: true };
  }

  completeTask(id: string, taskId: string, evidenceHash: string, success: boolean): CompleteTaskResult {
    const agent = this.agents.get(id);
    if (!agent) {
      return { ok: false, error: 'Agent not found' };
    }

    if (agent.currentTaskId !== taskId) {
      return { ok: false, error: 'Task ID mismatch' };
    }

    agent.currentTaskId = undefined;
    agent.status = 'idle';
    agent.tasksCompleted++;
    agent.updatedAt = new Date().toISOString();

    agent.evidenceHashes.push(evidenceHash);
    // Don't add user-provided evidenceHash to evidenceChain - only internally generated hashes

    // Also add completion evidence (internally generated)
    const completionHash = sha256Json({
      type: 'task_completed',
      agentId: id,
      taskId,
      success,
      evidenceHash,
      timestamp: agent.updatedAt,
      version: 'task-completed-v1',
    });

    agent.evidenceHashes.push(completionHash);
    this.evidenceChain.push(completionHash);

    return { ok: true };
  }

  unregister(id: string): UnregisterResult {
    const agent = this.agents.get(id);
    if (!agent) {
      return { ok: false, error: 'Agent not found' };
    }

    if (agent.status === 'busy') {
      return { ok: false, error: 'Cannot unregister busy agent' };
    }

    const evidenceHash = sha256Json({
      type: 'agent_unregistered',
      agentId: id,
      timestamp: new Date().toISOString(),
      version: 'agent-unregistered-v1',
    });

    this.evidenceChain.push(evidenceHash);
    this.agents.delete(id);

    return { ok: true };
  }

  list(): AgentInstance[] {
    return Array.from(this.agents.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getAvailable(capability: AgentCapability): AgentInstance[] {
    return this.list().filter(
      (a) => a.capabilities.includes(capability) && (a.status === 'idle' || a.status === 'active')
    );
  }

  verifyEvidenceChain(): EvidenceVerification {
    const errors: string[] = [];
    // Verify all internally generated hashes in evidenceChain are valid hex format
    for (const hash of this.evidenceChain) {
      if (!/^[a-f0-9]{64}$/.test(hash)) {
        errors.push(`Invalid hash format: ${hash}`);
      }
    }
    // Note: agent.evidenceHashes may contain user-provided hashes (e.g., from completeTask),
    // which are not validated here. Only internally generated hashes in evidenceChain are verified.
    // Debug: log errors for investigation
    if (errors.length > 0) {
      console.log('[AgentRegistry] Evidence chain errors:', errors);
    }
    return { valid: errors.length === 0, errors };
  }

  getStats(): RegistryStats {
    const agents = Array.from(this.agents.values());
    const byStatus: Record<AgentStatus, number> = {
      active: 0,
      idle: 0,
      busy: 0,
      stopping: 0,
      stopped: 0,
      registering: 0,
    };
    const byRole: Record<string, number> = {};

    for (const agent of agents) {
      byStatus[agent.status]++;
      byRole[agent.role] = (byRole[agent.role] || 0) + 1;
    }

    return {
      total: agents.length,
      byStatus,
      byRole,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    };
  }
}

export const agentRegistry = new AgentRegistry();