export type DsgAppBuilderEngineId = 'dsg-native' | 'gemini-studio' | 'openhands-adapter' | 'workflow-adapter';

export type DsgAppBuilderEngineCapability =
  | 'prd'
  | 'plan'
  | 'code_generation'
  | 'preview'
  | 'pull_request'
  | 'workflow'
  | 'review'
  | 'sandbox';

export type DsgAppBuilderEngineRisk = 'low' | 'medium' | 'high';

export type DsgAppBuilderEngineDescriptor = {
  id: DsgAppBuilderEngineId;
  label: string;
  status: 'available' | 'adapter_stub' | 'requires_config' | 'blocked';
  risk: DsgAppBuilderEngineRisk;
  capabilities: DsgAppBuilderEngineCapability[];
  userValue: string;
  requiredEnv: string[];
  licenseBoundary: string;
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
    truthBoundary: 'Model output is unverified until DSG checks allowed paths, commands, secrets, build, and evidence.',
  },
  {
    id: 'openhands-adapter',
    label: 'OpenHands-style Adapter',
    status: 'adapter_stub',
    risk: 'high',
    capabilities: ['code_generation', 'pull_request', 'sandbox'],
    userValue: 'Future coding-agent engine for branch-only implementation and PR output.',
    requiredEnv: ['GITHUB_TOKEN'],
    licenseBoundary: 'Adapter only. If open-source code is vendored later, preserve license notices and isolate engine code.',
    truthBoundary: 'Not active execution yet. Must run in sandbox branch with path/command allowlist and no direct production write.',
  },
  {
    id: 'workflow-adapter',
    label: 'Workflow Adapter',
    status: 'adapter_stub',
    risk: 'medium',
    capabilities: ['workflow', 'preview', 'review'],
    userValue: 'Future no-code style workflow bridge for Zapier/Make/n8n-like task flow inside DSG guardrails.',
    requiredEnv: [],
    licenseBoundary: 'Adapter abstraction only. Do not copy vendor UI, brand, or restricted license code.',
    truthBoundary: 'Workflow plan is not runtime proof until executed with audit/evidence rows.',
  },
];
