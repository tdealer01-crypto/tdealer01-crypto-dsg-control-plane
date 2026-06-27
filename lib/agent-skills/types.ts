export type SkillSourceType = 'github' | 'npm' | 'local';

export type SkillStatus =
  | 'discovered'
  | 'draft'
  | 'needs_review'
  | 'needs_approval'
  | 'verified'
  | 'blocked';

export type SkillRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SkillPermissions = {
  network: boolean;
  filesystem: 'none' | 'read' | 'write';
  secrets: boolean;
  codeExecution: boolean;
  externalWrite: boolean;
};

export type GitHubSkillSource = {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  license: string | null;
  language: string | null;
  topics: string[];
  lastCommit: string | null;
};

export type SkillInspection = {
  source: GitHubSkillSource;
  hasReadme: boolean;
  hasLicense: boolean;
  hasTests: boolean;
  hasSchemaOrTypes: boolean;
  hasSecretHardcoded: boolean;
  hasExternalWrite: boolean;
  hasCodeExecution: boolean;
  dependencies: string[];
  securityPolicy: boolean;
  rawReadme: string | null;
  rawPackageJson: Record<string, unknown> | null;
};

export type SkillDraft = {
  id: string;
  name: string;
  sourceType: SkillSourceType;
  sourceUrl: string;
  sourceOwner: string;
  sourceRepo: string;
  description: string;
  status: 'draft';
  riskLevel: SkillRiskLevel;
  permissions: SkillPermissions;
  draftedAt: string;
};

export type SkillVerificationResult = {
  status: 'verified' | 'needs_review' | 'needs_approval' | 'blocked';
  reasons: string[];
  z3ProofHash?: string;
  checks: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasTests: boolean;
    noHardcodedSecrets: boolean;
    noExternalWrite: boolean;
    noCodeExecution: boolean;
    riskLevel: SkillRiskLevel;
    z3Pass?: boolean;
  };
};

export type SkillLockEntry = {
  source: string;
  sourceType: SkillSourceType;
  sourceUrl: string;
  sourceCommit: string | null;
  computedHash: string;
  status: 'needs_review' | 'needs_approval' | 'verified' | 'blocked';
  riskLevel: SkillRiskLevel;
  permissions: SkillPermissions;
  registeredAt: string;
  description: string;
  z3ProofHash?: string;
};

export type SkillsLock = {
  version: number;
  updatedAt: string;
  skills: Record<string, SkillLockEntry>;
};

export type SkillRunRequest = {
  skillId: string;
  goal: string;
  args?: Record<string, unknown>;
};

export type SkillRunResult = {
  ok: boolean;
  skillId: string;
  gateStatus: 'ready' | 'blocked' | 'review';
  gateReason?: string;
  simulated: boolean;
  auditId: string;
};
