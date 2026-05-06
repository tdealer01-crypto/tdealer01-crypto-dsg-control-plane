export type DsgAppBuilderEngineId =
  | 'dsg-native'
  | 'gemini-studio'
  | 'openhands-adapter'
  | 'dify-workflow-adapter'
  | 'flowise-visual-adapter'
  | 'workflow-adapter';

export type DsgAppBuilderEngineCapability =
  | 'prd'
  | 'plan'
  | 'code_generation'
  | 'preview'
  | 'pull_request'
  | 'workflow'
  | 'rag'
  | 'visual_builder'
  | 'review'
  | 'sandbox';

export type DsgAppBuilderEngineRisk = 'low' | 'medium' | 'high' | 'critical';

export type DsgAppBuilderEngineDescriptor = {
  id: DsgAppBuilderEngineId;
  label: string;
  status: 'available' | 'adapter_stub' | 'requires_config' | 'blocked';
  risk: DsgAppBuilderEngineRisk;
  capabilities: DsgAppBuilderEngineCapability[];
  userValue: string;
  requiredEnv: string[];
  licenseBoundary: string;
  securityBoundary: string;
  truthBoundary: string;
};

export type DsgAppBuilderEngineRunInput = {
  jobId: string;
  goal: string;
  successCriteria: string[];
  engineId: DsgAppBuilderEngineId;
  mode: 'plan_only' | 'preview_only' | 'generate_pr';
};

export type DsgAppBuilderEngineRunResult = {
  ok: true;
  jobId: string;
  engineId: DsgAppBuilderEngineId;
  mode: DsgAppBuilderEngineRunInput['mode'];
  claimStatus: 'PLANNED_ONLY' | 'IMPLEMENTED_UNVERIFIED' | 'BLOCKED';
  summary: string;
  nextActions: string[];
  preview: {
    title: string;
    screens: string[];
    dataObjects: string[];
    apiRoutes: string[];
  };
  evidence: {
    licenseGate: string;
    securityGate: string;
    sandboxGate: string;
    pathGate: string;
    secretGate: string;
    productionClaim: false;
  };
};

export const DSG_APP_BUILDER_ENGINES: DsgAppBuilderEngineDescriptor[] = [
  {
    id: 'dsg-native',
    label: 'DSG Native Engine',
    status: 'available',
    risk: 'low',
    capabilities: ['prd', 'plan', 'preview', 'review', 'sandbox'],
    userValue: 'Fastest safe path for PRD, plan, monitor, preview, and evidence-first UI without external runtime dependency.',
    requiredEnv: [],
    licenseBoundary: 'Native repository code. No third-party engine code copied.',
    securityBoundary: 'Runs inside DSG allowlist and preview-only boundary unless explicit runtime proof exists.',
    truthBoundary: 'Can plan and preview. Production generation still requires build, PR, deploy, and live proof.',
  },
  {
    id: 'gemini-studio',
    label: 'Gemini Studio Adapter',
    status: 'requires_config',
    risk: 'medium',
    capabilities: ['prd', 'plan', 'code_generation', 'review'],
    userValue: 'Model/tool-calling layer for turning a user command into PRD, plan, and implementation intent.',
    requiredEnv: ['GOOGLE_GENERATIVE_AI_API_KEY'],
    licenseBoundary: 'Adapter boundary only. Do not store third-party prompts, keys, or generated claims without DSG evidence.',
    securityBoundary: 'Model output must pass DSG path, command, secret, and production-claim gates before any file write.',
    truthBoundary: 'Model output is unverified until DSG checks allowed paths, commands, secrets, build, and evidence.',
  },
  {
    id: 'openhands-adapter',
    label: 'OpenHands-style Coding Agent Adapter',
    status: 'adapter_stub',
    risk: 'high',
    capabilities: ['code_generation', 'pull_request', 'sandbox'],
    userValue: 'Coding-agent style engine for future branch-only implementation, command execution, and PR output.',
    requiredEnv: ['GITHUB_TOKEN', 'DSG_SANDBOX_RUNNER_URL'],
    licenseBoundary: 'Adapter only. If OpenHands OSS code is vendored later, keep MIT copyright/license notices and keep separately licensed enterprise directory code out unless licensed.',
    securityBoundary: 'Must run in sandbox. No direct main writes. Path allowlist, command allowlist, secret denylist, audit, rollback, and PR-only output required.',
    truthBoundary: 'Not active execution yet. Can be represented as a gated adapter until sandbox runner and proof are implemented.',
  },
  {
    id: 'dify-workflow-adapter',
    label: 'Dify-style Workflow/RAG Adapter',
    status: 'adapter_stub',
    risk: 'high',
    capabilities: ['workflow', 'rag', 'prd', 'plan', 'review'],
    userValue: 'Workflow/RAG/agent-builder style backend for customer automations, knowledge workflows, and app flows.',
    requiredEnv: ['DIFY_API_BASE_URL', 'DIFY_API_KEY'],
    licenseBoundary: 'Adapter only. Do not copy Dify frontend/logo/console, do not operate restricted multi-tenant Dify source deployments without license review.',
    securityBoundary: 'Use as a private backend connector behind DSG. Tenant isolation, API-key scope, prompt/data retention, and workflow export review required.',
    truthBoundary: 'Workflow outputs are unverified until DSG records run evidence, data boundary, approval, and audit rows.',
  },
  {
    id: 'flowise-visual-adapter',
    label: 'Flowise-style Visual Workflow Adapter',
    status: 'blocked',
    risk: 'critical',
    capabilities: ['workflow', 'visual_builder', 'preview', 'review'],
    userValue: 'Visual node/workflow design pattern for future low-code builder UX.',
    requiredEnv: ['FLOWISE_API_BASE_URL', 'FLOWISE_API_KEY'],
    licenseBoundary: 'Adapter/design pattern only. Do not copy vendor UI/brand. Any runtime integration must preserve licenses and notices.',
    securityBoundary: 'Blocked by default because visual workflow runtimes can execute tools/code. Only allow isolated, patched, private-network deployments with no public admin surface and DSG secret boundary.',
    truthBoundary: 'Not allowed for production execution until version, isolation, RBAC, secret handling, audit, and vulnerability review pass.',
  },
  {
    id: 'workflow-adapter',
    label: 'Generic Workflow Adapter',
    status: 'adapter_stub',
    risk: 'medium',
    capabilities: ['workflow', 'preview', 'review'],
    userValue: 'Generic no-code style workflow bridge for Zapier/Make/n8n-like task flow inside DSG guardrails.',
    requiredEnv: [],
    licenseBoundary: 'Adapter abstraction only. Do not copy vendor UI, brand, or restricted license code.',
    securityBoundary: 'Workflow actions must stay behind DSG allowlists and approval gates before execution.',
    truthBoundary: 'Workflow plan is not runtime proof until executed with audit/evidence rows.',
  },
];
