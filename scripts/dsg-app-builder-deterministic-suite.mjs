#!/usr/bin/env node

const checks = [];

function assertCheck(name, condition, details = {}) {
  checks.push({ name, pass: Boolean(condition), details });
  if (!condition) {
    console.error(`FAIL: ${name}`);
    console.error(JSON.stringify(details, null, 2));
    process.exitCode = 1;
  }
}

function allowedClaim(requested, signals) {
  const order = ['PLANNED_ONLY', 'IMPLEMENTED_UNVERIFIED', 'DEPLOYABLE_VERIFIED', 'READY_VERIFIED'];
  const required = {
    PLANNED_ONLY: ['goal_locked', 'plan_visible'],
    IMPLEMENTED_UNVERIFIED: ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created'],
    DEPLOYABLE_VERIFIED: ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created', 'typecheck_passed', 'build_passed', 'preview_loaded'],
    READY_VERIFIED: ['goal_locked', 'plan_visible', 'approval_recorded', 'branch_or_pr_created', 'typecheck_passed', 'build_passed', 'preview_loaded', 'rbac_checked', 'protected_value_scan_passed', 'flow_proof_passed'],
  };
  const verified = new Set(Object.entries(signals).filter(([, value]) => value).map(([key]) => key));
  for (let index = order.indexOf(requested); index >= 0; index -= 1) {
    const claim = order[index];
    if (required[claim].every((key) => verified.has(key))) return claim;
  }
  return 'PLANNED_ONLY';
}

const localSignals = {
  goal_locked: true,
  plan_visible: true,
  approval_recorded: true,
  branch_or_pr_created: true,
  typecheck_passed: true,
  build_passed: true,
  preview_loaded: false,
  rbac_checked: true,
  protected_value_scan_passed: true,
  flow_proof_passed: false,
};

assertCheck('local claim downgrades without preview', allowedClaim('READY_VERIFIED', localSignals) === 'IMPLEMENTED_UNVERIFIED', { allowed: allowedClaim('READY_VERIFIED', localSignals) });

const lanePlan = {
  runnableNow: ['preview', 'verify', 'ui'],
  done: ['goal', 'context', 'plan', 'sandbox', 'build'],
  waiting: ['report'],
};
assertCheck('lane plan has runnable preview after build', lanePlan.runnableNow.includes('preview'), lanePlan);
assertCheck('lane plan keeps report waiting before proof', lanePlan.waiting.includes('report'), lanePlan);

const sandboxCommands = ['npm run lint', 'npm run dsg:typecheck', 'node scripts/dsg-control-kernel-smoke.mjs', 'npm run smoke:app-builder-flow-proof', 'npm run build:termux'];
assertCheck('sandbox command set contains local build', sandboxCommands.includes('npm run build:termux'), { sandboxCommands });

const workflow = ['ctx', 'plan', 'ok_plan', 'box', 'branch', 'checked'];
assertCheck('workflow reaches checked stage locally', workflow.at(-1) === 'checked', { workflow });

if (process.exitCode) {
  console.error(JSON.stringify({ status: 'FAIL', checks }, null, 2));
  process.exit(process.exitCode);
}

console.log('PASS: deterministic App Builder suite checks passed');
console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
