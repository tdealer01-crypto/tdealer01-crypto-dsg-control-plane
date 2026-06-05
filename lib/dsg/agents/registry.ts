import type { AgentRegistration } from './types';

const AGENTS: AgentRegistration[] = [
  {
    agentType: 'orchestrator',
    label: 'Orchestrator Agent',
    description: 'Coordinates all other agents. Assigns tasks and monitors completion. Requires goal_locked before dispatching.',
    capabilities: [
      { id: 'dispatch-agent', label: 'Dispatch sub-agent', requiresApproval: true, riskLevel: 'medium' },
      { id: 'read-job-status', label: 'Read job status', requiresApproval: false, riskLevel: 'low' },
    ],
    skillId: 'dsg-orchestrator-agent',
    endpoint: '/api/dsg/agents/orchestrator',
    truthBoundary:
      'Orchestrator manages dispatch order only. It does not execute code, deploy, or write files. All sub-agent actions require their own Z3 proof and gate approval.',
  },
  {
    agentType: 'code-evolution',
    label: 'Code Evolution Agent',
    description: 'Reads codebase via Seed Engine, writes code changes, creates GitHub PRs. Requires approved plan.',
    capabilities: [
      { id: 'read-codebase', label: 'Read codebase state', requiresApproval: false, riskLevel: 'low' },
      { id: 'write-code', label: 'Write code changes', requiresApproval: true, riskLevel: 'high' },
      { id: 'create-pr', label: 'Create GitHub PR', requiresApproval: true, riskLevel: 'high' },
    ],
    skillId: 'dsg-code-evolution-agent',
    endpoint: '/api/dsg/agents/code-evolution',
    truthBoundary:
      'Code evolution creates PR evidence only. CI, deployment, and production proof are separate claims.',
  },
  {
    agentType: 'test-coverage',
    label: 'Test Coverage Agent',
    description: 'Monitors test coverage. Auto-generates tests when below threshold. Coverage must only move up.',
    capabilities: [
      { id: 'read-coverage', label: 'Read CI coverage report', requiresApproval: false, riskLevel: 'low' },
      { id: 'add-tests', label: 'Add new test files', requiresApproval: true, riskLevel: 'medium' },
    ],
    skillId: 'dsg-test-coverage-agent',
    endpoint: '/api/dsg/agents/test-coverage',
    truthBoundary:
      'Test Coverage Agent adds tests but cannot guarantee all edge cases are covered. Coverage is monotonically enforced by Z3 invariant.',
  },
  {
    agentType: 'deploy-monitor',
    label: 'Deploy Monitor Agent',
    description: 'Watches Vercel deployments, diagnoses config issues, triggers re-deploy with proof.',
    capabilities: [
      { id: 'read-deploy-status', label: 'Read deployment status', requiresApproval: false, riskLevel: 'low' },
      { id: 'trigger-deploy', label: 'Trigger re-deployment', requiresApproval: true, riskLevel: 'critical' },
      { id: 'write-deployment-proof', label: 'Record deployment proof', requiresApproval: false, riskLevel: 'low' },
    ],
    skillId: 'dsg-deploy-monitor-agent',
    endpoint: '/api/dsg/agents/deploy-monitor',
    truthBoundary:
      'Deploy Monitor requires gate_allow AND evidence_exists AND no mock_state before any deploy trigger. Never claims production-ready without proof.',
  },
  {
    agentType: 'browser-research',
    label: 'Browser Research Agent',
    description: 'Uses remote browser to gather external information with tamper-evident evidence hashes.',
    capabilities: [
      { id: 'browser-snapshot', label: 'Take browser snapshot', requiresApproval: true, riskLevel: 'medium' },
      { id: 'store-evidence', label: 'Store evidence hash', requiresApproval: false, riskLevel: 'low' },
    ],
    skillId: 'dsg-browser-research-agent',
    endpoint: '/api/dsg/agents/browser-research',
    truthBoundary:
      'All browser results carry SHA256 evidence hashes. Data cannot be used in decisions without the hash being present in dsg_evidence_items.',
  },
  {
    agentType: 'security-gate',
    label: 'Security Gate Agent',
    description: 'Wraps every other agent. Enforces DSG control plane gate before any execution.',
    capabilities: [
      { id: 'gate-check', label: 'Run gate check', requiresApproval: false, riskLevel: 'low' },
      { id: 'block-action', label: 'Block non-approved action', requiresApproval: false, riskLevel: 'low' },
    ],
    skillId: 'dsg-security-gate-agent',
    endpoint: '/api/dsg/agents/security-gate',
    truthBoundary:
      'Security Gate only evaluates gate decisions. It does not execute actions itself. gate_allow must be true before any other agent runs.',
  },
];

const REGISTRY = new Map<string, AgentRegistration>(AGENTS.map((a) => [a.agentType, a]));

export function listAgents(): AgentRegistration[] {
  return AGENTS;
}

export function getAgent(agentType: string): AgentRegistration | undefined {
  return REGISTRY.get(agentType);
}

export function isValidAgentType(value: string): value is AgentRegistration['agentType'] {
  return REGISTRY.has(value);
}
