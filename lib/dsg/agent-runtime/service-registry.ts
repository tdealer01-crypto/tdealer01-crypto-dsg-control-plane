import {
  APP_BUILDER_AGENT_RUNTIME_TOOL_NAME,
  APP_BUILDER_BUILD_TOOL_NAME,
} from '@/lib/dsg/app-builder/build-tools';
import { getOpenAIAdapterStatus } from '@/lib/dsg/ai/openai-adapter';

export type AgentRuntimeServiceStatus =
  | 'available'
  | 'approval_required'
  | 'connector_required'
  | 'quota_gated';

export type AgentRuntimeServiceImplementation =
  | 'server_tool_call'
  | 'server_runtime_contract'
  | 'server_ai_adapter'
  | 'client_browser_action'
  | 'not_implemented_in_repo';

export type AgentRuntimeService = {
  id: string;
  label: string;
  description: string;
  status: AgentRuntimeServiceStatus;
  implementation: AgentRuntimeServiceImplementation;
  action: string;
  endpoint?: string;
  requiredSecrets: string[];
  evidence: string[];
  userBenefit: string;
  truthBoundary: string;
};

function remoteBrowserContractStatus(): AgentRuntimeServiceStatus {
  return process.env.DSG_REMOTE_BROWSER_ENABLED === 'true' ? 'connector_required' : 'connector_required';
}

function openAIAdapterServiceStatus(): AgentRuntimeServiceStatus {
  return getOpenAIAdapterStatus().configured ? 'available' : 'connector_required';
}

export function listAgentRuntimeServices(): AgentRuntimeService[] {
  const openAIStatus = getOpenAIAdapterStatus();
  return [
    {
      id: 'openai.responses.generate',
      label: 'OpenAI Responses adapter',
      description: 'Server-side OpenAI adapter for governed agent text generation and planning support.',
      status: openAIAdapterServiceStatus(),
      implementation: 'server_ai_adapter',
      action: 'Call /api/dsg/ai/openai/chat from server-backed UI actions after policy allows it.',
      endpoint: '/api/dsg/ai/openai/chat',
      requiredSecrets: ['OPENAI_API_KEY'],
      evidence: ['responseId', 'model', 'usage', 'outputText'],
      userBenefit: 'The user can get AI-generated summaries, plans, and copy without exposing API keys in the browser.',
      truthBoundary: openAIStatus.truthBoundary,
    },
    {
      id: APP_BUILDER_AGENT_RUNTIME_TOOL_NAME,
      label: 'Launch App Builder agent runtime',
      description: 'Runs after a visible plan is approved. It prepares runtime environment, action-layer contract, audit event, and notification payload.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'Use from the App Builder flow after approval.',
      endpoint: '/api/dsg/app-builder/jobs/:jobId/tool-call',
      requiredSecrets: ['GITHUB_TOKEN'],
      evidence: ['runtime-environment-manifest', 'action-layer-contract', 'audit-event', 'notification-payload'],
      userBenefit: 'The user sees a controlled execution path instead of hidden automation.',
      truthBoundary: 'This creates runtime/PR evidence only. It is not production deployment proof.',
    },
    {
      id: APP_BUILDER_BUILD_TOOL_NAME,
      label: 'Generate full-stack GitHub PR',
      description: 'Writes generated frontend, API route, Supabase migration, and runbook files to a GitHub branch and opens a pull request.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'Use from the App Builder flow after runtime handoff.',
      endpoint: '/api/dsg/app-builder/jobs/:jobId/tool-call',
      requiredSecrets: ['GITHUB_TOKEN'],
      evidence: ['pullRequestUrl', 'pullRequestNumber', 'branchName', 'generatedFiles'],
      userBenefit: 'The user receives a real PR they can inspect, review, and merge later.',
      truthBoundary: 'The PR is implementation evidence. CI, migration apply, preview, and production proof are separate steps.',
    },
    {
      id: 'dsg.environment.provision',
      label: 'Provision runtime environment manifest',
      description: 'Creates or reuses a GitHub branch and writes an environment manifest before the build tool runs.',
      status: 'approval_required',
      implementation: 'server_runtime_contract',
      action: 'Executed by the approved App Builder runtime tool.',
      requiredSecrets: ['GITHUB_TOKEN'],
      evidence: ['branchCreatedOrReused', 'manifestWritten', 'manifestPath'],
      userBenefit: 'The user sees what environment and permissions were prepared before code generation.',
      truthBoundary: 'Environment readiness is not build, deployment, or production proof.',
    },
    {
      id: 'browser.local.open_url',
      label: 'Open generated app in this browser',
      description: 'Client-side action that opens a target URL in the user browser for manual visual proof collection.',
      status: 'available',
      implementation: 'client_browser_action',
      action: 'Open URL from the Agent Services screen.',
      requiredSecrets: [],
      evidence: ['manual-screenshot', 'user-visible-url', 'customer-observed-result'],
      userBenefit: 'The user can immediately inspect a generated app route or proof page without spending extra automation quota.',
      truthBoundary: 'This is not remote browser automation. It is local browser inspection only.',
    },
    {
      id: 'remote.browser.session',
      label: 'Remote browser session',
      description: 'Manus-style remote browser automation contract for future executor integration.',
      status: remoteBrowserContractStatus(),
      implementation: 'not_implemented_in_repo',
      action: 'Connect a real remote browser executor before enabling autonomous browsing.',
      requiredSecrets: ['DSG_REMOTE_BROWSER_ENABLED', 'REMOTE_BROWSER_ENDPOINT_OR_VENDOR_TOKEN'],
      evidence: ['browser-session-id', 'screenshot-url', 'navigation-log', 'task-result'],
      userBenefit: 'Once connected, the agent can inspect web pages and return browser proof without the user manually clicking through.',
      truthBoundary: 'Remote browser contract and APIs exist, but autonomous browser control remains connector-required until a verified provider adapter is wired.',
    },
    {
      id: 'dsg.agent.orchestrator',
      label: 'Orchestrator Agent',
      description: 'Coordinates all 5 specialist agents. Requires goal_locked before dispatching sub-agents.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/orchestrator with jobId, goal, goalLocked, subGoals.',
      endpoint: '/api/dsg/agents/orchestrator',
      requiredSecrets: [],
      evidence: ['z3ProofHash', 'dispatched', 'blocked'],
      userBenefit: 'User sees which agents ran and which were blocked by Z3 invariants.',
      truthBoundary: 'Orchestrator manages dispatch only. Does not execute code or deploy.',
    },
    {
      id: 'dsg.agent.code-evolution',
      label: 'Code Evolution Agent',
      description: 'Reads codebase via Seed Engine, writes code with approved plan, creates GitHub PRs.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/code-evolution with planApproved=true.',
      endpoint: '/api/dsg/agents/code-evolution',
      requiredSecrets: ['GITHUB_TOKEN'],
      evidence: ['codebaseStateHash', 'z3ProofHash', 'readyToWrite'],
      userBenefit: 'Code only changes when plan is formally approved and Z3 invariants pass.',
      truthBoundary: 'Creates PR evidence only. CI and deployment proof are separate claims.',
    },
    {
      id: 'dsg.agent.test-coverage',
      label: 'Test Coverage Agent',
      description: 'Monitors coverage. Z3 enforces monotonically non-decreasing invariant.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/test-coverage with previousCoveragePct, currentCoveragePct.',
      endpoint: '/api/dsg/agents/test-coverage',
      requiredSecrets: [],
      evidence: ['z3ProofHash', 'coverageIncreased', 'needsMoreTests'],
      userBenefit: 'Coverage can never decrease — Z3 blocks any regression mathematically.',
      truthBoundary: 'Coverage monotonicity is Z3-verified. Full coverage still requires manual review.',
    },
    {
      id: 'dsg.agent.deploy-monitor',
      label: 'Deploy Monitor Agent',
      description: 'Watches Vercel. Triggers deploy only after gate_allow + evidence + no mock_state.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/deploy-monitor with deploymentUrl, gateAllow.',
      endpoint: '/api/dsg/agents/deploy-monitor',
      requiredSecrets: ['VERCEL_TOKEN'],
      evidence: ['deploymentStatusHash', 'z3ProofHash', 'canTriggerDeploy'],
      userBenefit: 'Deployment only happens when all three Z3 invariants (gate + evidence + no mock) pass.',
      truthBoundary: 'Never claims production-ready without deployment proof hash.',
    },
    {
      id: 'dsg.agent.browser-research',
      label: 'Browser Research Agent',
      description: 'Browser research with SHA256 tamper-evident evidence. No evidence hash = BLOCK.',
      status: 'approval_required',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/browser-research with researchQuery.',
      endpoint: '/api/dsg/agents/browser-research',
      requiredSecrets: [],
      evidence: ['evidenceHash', 'z3ProofHash', 'content'],
      userBenefit: 'Research results are always traceable to a tamper-evident hash.',
      truthBoundary: 'All browser results carry SHA256 hashes stored in dsg_evidence_items.',
    },
    {
      id: 'dsg.agent.security-gate',
      label: 'Security Gate Agent',
      description: 'Gate check before any agent execution. gate_allow required by Z3 invariant.',
      status: 'available',
      implementation: 'server_tool_call',
      action: 'POST /api/dsg/agents/security-gate with actionId, agentType, riskLevel.',
      endpoint: '/api/dsg/agents/security-gate',
      requiredSecrets: [],
      evidence: ['z3ProofHash', 'decision', 'actionId'],
      userBenefit: 'Every action is formally gate-checked before execution.',
      truthBoundary: 'Gate evaluates decisions only. Does not execute actions itself.',
    },
    {
      id: 'dsg.seed.engine',
      label: 'Seed Engine',
      description: 'Fetches real data before agent execution. If data unknown → must search. Never guesses.',
      status: 'available',
      implementation: 'server_tool_call',
      action: 'Import seedData() from lib/dsg/seed/seed-engine.ts.',
      requiredSecrets: [],
      evidence: ['evidenceHash', 'sourceUrl', 'gateStatus'],
      userBenefit: 'Agents always operate on real verified data, not hallucinated state.',
      truthBoundary: 'If search fails and requiredEvidence=true, Seed Engine returns BLOCK. Never returns guessed data.',
    },
    {
      id: 'vercel.preview.proof',
      label: 'Vercel preview / production proof',
      description: 'Quota-gated proof step for preview or production verification after PR and CI are ready.',
      status: 'quota_gated',
      implementation: 'not_implemented_in_repo',
      action: 'Use only when proof is required, not for every UI edit.',
      requiredSecrets: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
      evidence: ['deployment-url', 'deployment-id', 'production-flow-proof'],
      userBenefit: 'The user preserves Vercel quota and spends it only on proof that matters.',
      truthBoundary: 'Do not trigger production deploy from customer UI changes.',
    },
  ];
}
