import { controlHash } from './control-kernel';

export type SandboxCommandKind = 'install' | 'lint' | 'typecheck' | 'smoke' | 'build';
export type SandboxContractStatus = 'PASS' | 'BLOCK';

export type SandboxCommand = {
  kind: SandboxCommandKind;
  command: string;
  required: boolean;
};

export type SandboxArtifact = {
  name: string;
  path: string;
  required: boolean;
};

export type SandboxContractInput = {
  jobId: string;
  branchName: string;
  filePaths: string[];
  commands?: SandboxCommand[];
  artifacts?: SandboxArtifact[];
};

export type SandboxContract = {
  status: SandboxContractStatus;
  jobId: string;
  branchName: string;
  filePaths: string[];
  commands: SandboxCommand[];
  artifacts: SandboxArtifact[];
  blockedReasons: string[];
  nextAction: string;
  contractHash: string;
};

const allowedPathPrefixes = [
  'app/',
  'components/',
  'lib/',
  'scripts/',
  'docs/',
  'supabase/migrations/',
];

const allowedCommands = new Set([
  'npm run lint',
  'npm run dsg:typecheck',
  'node scripts/dsg-control-kernel-smoke.mjs',
  'npm run smoke:app-builder-flow-proof',
  'npm run build:termux',
]);

export function defaultSandboxCommands(): SandboxCommand[] {
  return [
    { kind: 'lint', command: 'npm run lint', required: true },
    { kind: 'typecheck', command: 'npm run dsg:typecheck', required: true },
    { kind: 'smoke', command: 'node scripts/dsg-control-kernel-smoke.mjs', required: true },
    { kind: 'smoke', command: 'npm run smoke:app-builder-flow-proof', required: true },
    { kind: 'build', command: 'npm run build:termux', required: true },
  ];
}

export function defaultSandboxArtifacts(jobId: string): SandboxArtifact[] {
  return [
    { name: 'lint-output', path: `artifacts/app-builder/${jobId}/lint.txt`, required: true },
    { name: 'typecheck-output', path: `artifacts/app-builder/${jobId}/typecheck.txt`, required: true },
    { name: 'smoke-output', path: `artifacts/app-builder/${jobId}/smoke.txt`, required: true },
    { name: 'build-output', path: `artifacts/app-builder/${jobId}/build.txt`, required: true },
  ];
}

function validPath(path: string): boolean {
  const normalized = path.trim();
  if (!normalized || normalized.includes('..') || normalized.startsWith('/') || normalized.includes('\\')) return false;
  return allowedPathPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function validBranch(branchName: string): boolean {
  return /^[-a-zA-Z0-9/_]+$/.test(branchName) && branchName.length <= 120;
}

export function createSandboxContract(input: SandboxContractInput): SandboxContract {
  const commands = input.commands && input.commands.length ? input.commands : defaultSandboxCommands();
  const artifacts = input.artifacts && input.artifacts.length ? input.artifacts : defaultSandboxArtifacts(input.jobId);
  const blockedReasons: string[] = [];

  if (!input.jobId.trim()) blockedReasons.push('JOB_ID_REQUIRED');
  if (!validBranch(input.branchName)) blockedReasons.push('BRANCH_NAME_INVALID');
  for (const path of input.filePaths) {
    if (!validPath(path)) blockedReasons.push(`FILE_PATH_NOT_ALLOWED:${path}`);
  }
  for (const item of commands) {
    if (!allowedCommands.has(item.command)) blockedReasons.push(`COMMAND_NOT_ALLOWED:${item.command}`);
  }
  for (const item of artifacts) {
    if (!validPath(item.path)) blockedReasons.push(`ARTIFACT_PATH_NOT_ALLOWED:${item.path}`);
  }

  const basis = { input, commands, artifacts, blockedReasons };
  return {
    status: blockedReasons.length ? 'BLOCK' : 'PASS',
    jobId: input.jobId,
    branchName: input.branchName,
    filePaths: input.filePaths,
    commands,
    artifacts,
    blockedReasons,
    nextAction: blockedReasons.length ? 'Fix blocked paths, branch name, commands, or artifact paths before execution.' : 'Run commands locally and attach outputs as evidence.',
    contractHash: controlHash(basis),
  };
}
