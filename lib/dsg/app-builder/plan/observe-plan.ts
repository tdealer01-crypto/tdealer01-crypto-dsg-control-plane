import type { DsgPlanDraft, DsgPlanObserverReason, DsgPlanObserverResult } from './types';

const FORBIDDEN_PATH_PREFIXES = ['.env', '.git', 'node_modules'];
const HIGH_RISK_TYPES = new Set(['deploy', 'create_database', 'change_permission', 'charge_payment']);

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function pathIsForbidden(path: string): boolean {
  const normalized = normalizePath(path);
  if (!normalized || normalized === '**' || normalized.startsWith('**/')) return true;
  return FORBIDDEN_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function pathAllowed(path: string, allowedPaths: string[]): boolean {
  const normalized = normalizePath(path);
  if (pathIsForbidden(normalized)) return false;
  const allowed = allowedPaths.map((item) => normalizePath(item).replace(/\/$/, '')).filter(Boolean);
  if (!allowed.length || allowed.includes('**')) return false;
  return allowed.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function collectDependencyErrors(plan: DsgPlanDraft): DsgPlanObserverReason[] {
  const reasons: DsgPlanObserverReason[] = [];
  const byId = new Map(plan.actions.map((action) => [action.id, action]));

  for (const action of plan.actions) {
    for (const depId of action.dependsOn) {
      const dep = byId.get(depId);
      if (!dep) {
        reasons.push({ code: 'MISSING_DEPENDENCY', message: 'Action depends on a missing action.', actionId: action.id, details: { missingDependency: depId } });
      } else if (dep.wave >= action.wave) {
        reasons.push({
          code: 'DEPENDENCY_ORDER_VIOLATION',
          message: 'Action dependency must run in an earlier wave.',
          actionId: action.id,
          details: { dependencyId: dep.id, dependencyWave: dep.wave, actionWave: action.wave },
        });
      }
    }
  }

  return reasons;
}

function collectWriteConflicts(plan: DsgPlanDraft): DsgPlanObserverReason[] {
  const reasons: DsgPlanObserverReason[] = [];
  const seen = new Map<string, string>();

  for (const action of plan.actions) {
    for (const writePath of action.writes) {
      const normalized = normalizePath(writePath);
      const key = `${action.wave}:${normalized}`;
      const firstActionId = seen.get(key);
      if (firstActionId) {
        reasons.push({
          code: 'WRITE_CONFLICT_IN_SAME_WAVE',
          message: 'Two actions write to the same target in the same wave.',
          actionId: action.id,
          details: { wave: action.wave, path: normalized, firstActionId, secondActionId: action.id },
        });
      } else {
        seen.set(key, action.id);
      }
    }
  }

  return reasons;
}

export function observePlanDraft(plan: DsgPlanDraft): DsgPlanObserverResult {
  const reasons: DsgPlanObserverReason[] = [];

  if (!plan.goalLocked) reasons.push({ code: 'NO_GOAL_LOCK', message: 'Plan feasibility check requires a locked goal.' });
  if (!plan.planExists) reasons.push({ code: 'NO_PLAN', message: 'No proposed plan exists.' });
  if (!plan.actions.length) reasons.push({ code: 'NO_ACTIONS', message: 'Plan has no actions.' });

  const availableSecrets = new Set(plan.availableSecrets);
  const allowedCommands = new Set(plan.allowedCommands);

  for (const action of plan.actions) {
    for (const secret of action.requiredSecrets) {
      if (!availableSecrets.has(secret)) {
        reasons.push({ code: 'MISSING_REQUIRED_SECRET', message: 'Action requires a secret that is not available.', actionId: action.id, details: { secret } });
      }
    }

    for (const writePath of action.writes) {
      if (pathIsForbidden(writePath)) {
        reasons.push({ code: 'FORBIDDEN_WRITE_PATH', message: 'Action attempts to write to a forbidden path.', actionId: action.id, details: { path: writePath } });
      } else if (!pathAllowed(writePath, plan.allowedPaths)) {
        reasons.push({ code: 'WRITE_PATH_NOT_ALLOWED', message: 'Action writes outside allowed paths.', actionId: action.id, details: { path: writePath, allowedPaths: plan.allowedPaths } });
      }
    }

    if (action.type === 'run_command') {
      if (!action.command) {
        reasons.push({ code: 'MISSING_COMMAND', message: 'run_command action has no command.', actionId: action.id });
      } else if (!allowedCommands.has(action.command)) {
        reasons.push({ code: 'COMMAND_NOT_ALLOWED', message: 'Command is not in the allowlist.', actionId: action.id, details: { command: action.command, allowedCommands: plan.allowedCommands } });
      }
    }

    if (HIGH_RISK_TYPES.has(action.type) && !action.approved) {
      reasons.push({ code: 'HIGH_RISK_ACTION_NOT_APPROVED', message: 'High-risk action exists without approval. Observer reports this; Risk Control still owns approval.', actionId: action.id, details: { actionType: action.type, risk: action.risk } });
    }
  }

  reasons.push(...collectWriteConflicts(plan), ...collectDependencyErrors(plan));
  const status = reasons.length ? 'BLOCK' : 'PASS';

  return {
    gateName: 'PLAN_FEASIBILITY_OBSERVER',
    status,
    pass: status === 'PASS',
    z3RuntimeProof: false,
    observerMode: 'typescript_precheck_from_z3_contract',
    reasons,
    summary: {
      jobId: plan.jobId,
      workspaceId: plan.workspaceId,
      actions: plan.actions.length,
      waves: Array.from(new Set(plan.actions.map((action) => action.wave))).sort((a, b) => a - b),
      blockedReasons: reasons.length,
    },
  };
}
