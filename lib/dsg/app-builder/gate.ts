import type {
  AppBuilderGateIssue,
  AppBuilderGateResult,
  AppBuilderProposedPlan,
} from './model';
import type { AppBuilderRiskLevel } from './status';

const blockedCommands = [
  'rm -rf /',
  'curl | sh',
  'wget | sh',
  'sudo ',
  'chmod 777',
  'cat .env',
  'printenv',
];

const blockedExactCommands = ['env', 'set'];
const blockedExactPaths = ['**', '.env', '.env.local', '.env.production', '.git', 'node_modules'];
const blockedPathPrefixes = ['.git/', 'node_modules/', '/.git/', '/node_modules/'];
const blockedPathIncludes = ['/.env', '.env.', '../'];

function maxRisk(a: AppBuilderRiskLevel, b: AppBuilderRiskLevel): AppBuilderRiskLevel {
  const order: AppBuilderRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function commandBlocked(command: string): boolean {
  const normalized = command.trim().toLowerCase();
  return (
    blockedExactCommands.includes(normalized) ||
    blockedCommands.some((pattern) => normalized.includes(pattern))
  );
}

function absolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
}

function pathBlocked(path: string): boolean {
  const normalized = path.trim();
  if (!normalized) return true;
  if (absolutePath(normalized)) return true;
  if (blockedExactPaths.includes(normalized)) return true;
  if (blockedPathPrefixes.some((prefix) => normalized.startsWith(prefix))) return true;
  if (blockedPathIncludes.some((value) => normalized.includes(value))) return true;
  return false;
}

function issue(
  issues: AppBuilderGateIssue[],
  code: string,
  message: string,
  severity: AppBuilderGateIssue['severity'],
  stepId?: string,
): void {
  issues.push({ code, message, severity, stepId });
}

export function gateAppBuilderPlan(plan: AppBuilderProposedPlan): AppBuilderGateResult {
  const issues: AppBuilderGateIssue[] = [];
  let riskLevel: AppBuilderRiskLevel = plan.estimatedRiskLevel;

  if (!plan.steps.length) {
    issue(issues, 'PLAN_STEPS_REQUIRED', 'Plan has no steps.', 'BLOCK');
  }

  for (const path of plan.allowedPaths) {
    if (pathBlocked(path)) issue(issues, 'BLOCKED_PLAN_PATH', path, 'BLOCK');
  }

  for (const command of plan.allowedCommands) {
    if (commandBlocked(command)) issue(issues, 'BLOCKED_PLAN_COMMAND', command, 'BLOCK');
  }

  for (const step of plan.steps) {
    riskLevel = maxRisk(riskLevel, step.riskLevel);
    if (!step.id.trim()) issue(issues, 'STEP_ID_REQUIRED', 'Step id required.', 'BLOCK');

    for (const command of step.allowedCommands) {
      if (commandBlocked(command)) issue(issues, 'BLOCKED_COMMAND', command, 'BLOCK', step.id);
    }

    for (const path of step.allowedPaths) {
      if (pathBlocked(path)) issue(issues, 'BLOCKED_PATH', path, 'BLOCK', step.id);
    }

    if ((step.riskLevel === 'HIGH' || step.riskLevel === 'CRITICAL') && !step.requiresApproval) {
      issue(issues, 'HIGH_RISK_REQUIRES_APPROVAL', step.id, 'BLOCK', step.id);
    }

    if (!step.expectedEvidence.length) {
      issue(issues, 'EXPECTED_EVIDENCE_REQUIRED', step.id, 'WARN', step.id);
    }
  }

  const hasBlock = issues.some((item) => item.severity === 'BLOCK');

  return {
    status: hasBlock ? 'BLOCK' : riskLevel === 'LOW' ? 'PASS' : 'REVIEW',
    riskLevel,
    approvalRequired: riskLevel !== 'LOW' || plan.steps.some((step) => step.requiresApproval),
    issues,
  };
}
