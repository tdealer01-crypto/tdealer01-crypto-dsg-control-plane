import type {
  AppBuilderApprovalDecision,
  AppBuilderClaimStatus,
  AppBuilderGateStatus,
  AppBuilderJobStatus,
  AppBuilderRiskLevel,
} from './status';

export type {
  AppBuilderApprovalDecision,
  AppBuilderClaimStatus,
  AppBuilderGateStatus,
  AppBuilderJobStatus,
  AppBuilderRiskLevel,
};

export type AppBuilderTargetStack = {
  frontend?: 'nextjs' | 'react' | 'vue' | 'svelte' | 'other';
  backend?: 'next-api' | 'express' | 'fastify' | 'supabase' | 'other';
  database?: 'supabase-postgres' | 'postgres' | 'mysql' | 'sqlite' | 'none';
  auth?: 'supabase-auth' | 'nextauth' | 'clerk' | 'custom' | 'none';
  deploy?: 'vercel' | 'netlify' | 'cloudflare' | 'none';
};

export type AppBuilderGoalInput = {
  goal: string;
  successCriteria?: string[];
  targetStack?: AppBuilderTargetStack;
  constraints?: string[];
  userNotes?: string;
};

export type LockedAppBuilderGoal = {
  originalGoal: string;
  normalizedGoal: string;
  successCriteria: string[];
  targetStack: AppBuilderTargetStack;
  constraints: string[];
  lockedAt: string;
  goalHash: string;
};

export type AppBuilderPrd = {
  title: string;
  summary: string;
  userProblem: string;
  targetUsers: string[];
  coreFeatures: string[];
  nonGoals: string[];
  dataModelNotes: string[];
  authNotes: string[];
  uiNotes: string[];
  acceptanceCriteria: string[];
};

export type AppBuilderPlanPhase =
  | 'INSPECT'
  | 'DESIGN'
  | 'IMPLEMENT_FRONTEND'
  | 'IMPLEMENT_BACKEND'
  | 'DATABASE'
  | 'AUTH'
  | 'TEST'
  | 'BUILD'
  | 'DEPLOY'
  | 'VERIFY';

export type AppBuilderPlanStep = {
  id: string;
  title: string;
  description: string;
  phase: AppBuilderPlanPhase;
  riskLevel: AppBuilderRiskLevel;
  requiresApproval: boolean;
  allowedPaths: string[];
  allowedCommands: string[];
  requiredSecrets: string[];
  expectedEvidence: string[];
};

export type AppBuilderProposedPlan = {
  title: string;
  summary: string;
  steps: AppBuilderPlanStep[];
  allowedTools: string[];
  allowedPaths: string[];
  allowedCommands: string[];
  requiredSecrets: string[];
  estimatedRiskLevel: AppBuilderRiskLevel;
};

export type AppBuilderGateIssue = {
  code: string;
  message: string;
  severity: 'INFO' | 'WARN' | 'BLOCK';
  stepId?: string;
};

export type AppBuilderGateResult = {
  status: AppBuilderGateStatus;
  riskLevel: AppBuilderRiskLevel;
  approvalRequired: boolean;
  issues: AppBuilderGateIssue[];
};

export type AppBuilderApprovedPlan = {
  proposedPlan: AppBuilderProposedPlan;
  gateResult: AppBuilderGateResult;
  planHash: string;
  approvalHash: string;
  approvedBy: string;
  approvedAt: string;
  decision: Extract<AppBuilderApprovalDecision, 'APPROVE'>;
};

export type AppBuilderJob = {
  id: string;
  workspaceId: string;
  createdBy: string;
  status: AppBuilderJobStatus;
  claimStatus: AppBuilderClaimStatus;
  goal?: LockedAppBuilderGoal;
  prd?: AppBuilderPrd;
  proposedPlan?: AppBuilderProposedPlan;
  gateResult?: AppBuilderGateResult;
  approvedPlan?: AppBuilderApprovedPlan;
  planHash?: string;
  approvalHash?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
