#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = process.env.GATEWAY_SMT2_OUT_DIR || 'artifacts/gateway-smt2';

const cases = [
  {
    id: 'allow_low_risk_registered_tool',
    expectedDecision: 'allow',
    input: {
      hasOrg: true,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: true,
      actionMatchesTool: true,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 1,
      requiresApproval: false,
      hasApproval: false,
      evidenceWritable: true,
    },
  },
  {
    id: 'block_missing_org',
    expectedDecision: 'block',
    input: {
      hasOrg: false,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: true,
      actionMatchesTool: true,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 1,
      requiresApproval: false,
      hasApproval: false,
      evidenceWritable: true,
    },
  },
  {
    id: 'block_unregistered_tool',
    expectedDecision: 'block',
    input: {
      hasOrg: true,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: false,
      actionMatchesTool: false,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 0,
      requiresApproval: false,
      hasApproval: false,
      evidenceWritable: true,
    },
  },
  {
    id: 'block_high_risk_without_approval',
    expectedDecision: 'block',
    input: {
      hasOrg: true,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: true,
      actionMatchesTool: true,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 2,
      requiresApproval: false,
      hasApproval: false,
      evidenceWritable: true,
    },
  },
  {
    id: 'allow_high_risk_with_approval',
    expectedDecision: 'allow',
    input: {
      hasOrg: true,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: true,
      actionMatchesTool: true,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 2,
      requiresApproval: true,
      hasApproval: true,
      evidenceWritable: true,
    },
  },
  {
    id: 'block_evidence_not_writable',
    expectedDecision: 'block',
    input: {
      hasOrg: true,
      hasActor: true,
      hasActorRole: true,
      hasOrgPlan: true,
      isRegisteredTool: true,
      actionMatchesTool: true,
      actorRoleAllowed: true,
      planEntitled: true,
      risk: 1,
      requiresApproval: false,
      hasApproval: false,
      evidenceWritable: false,
    },
  },
];

await main();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = cases.map((testCase) => {
    const evaluation = evaluate(testCase.input);
    return {
      id: testCase.id,
      expectedDecision: testCase.expectedDecision,
      observedDecision: evaluation.decision,
      pass: testCase.expectedDecision === evaluation.decision,
      violated: evaluation.violated,
      smt2Hash: evaluation.smt2Hash,
      resultHash: evaluation.resultHash,
      smt2: evaluation.smt2,
    };
  });

  const passed = results.filter((result) => result.pass).length;
  const summary = {
    pass: passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: `${Math.round((passed / results.length) * 100)}%`,
  };

  const artifact = {
    generatedAt: new Date().toISOString(),
    suite: 'gateway-smt2-deterministic-invariants-v1',
    summary,
    results,
  };

  await fs.writeFile(path.join(OUT_DIR, 'gateway-smt2-invariants-result.json'), JSON.stringify(artifact, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'gateway-smt2-invariants-report.md'), renderReport(artifact));

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) {
    process.exitCode = 1;
  }
}

function bool(value) {
  return value ? 'true' : 'false';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function renderSmt2(input) {
  return `; DSG Gateway deterministic invariant check\n; Generated from normalized gateway request.\n; Risk scale: 0 low, 1 medium, 2 high, 3 critical\n\n(set-logic QF_UFLIA)\n\n(declare-const has_org Bool)\n(declare-const has_actor Bool)\n(declare-const has_actor_role Bool)\n(declare-const has_org_plan Bool)\n(declare-const is_registered_tool Bool)\n(declare-const action_matches_tool Bool)\n(declare-const actor_role_allowed Bool)\n(declare-const plan_entitled Bool)\n(declare-const risk Int)\n(declare-const requires_approval Bool)\n(declare-const has_approval Bool)\n(declare-const evidence_writable Bool)\n\n(assert (= has_org ${bool(input.hasOrg)}))\n(assert (= has_actor ${bool(input.hasActor)}))\n(assert (= has_actor_role ${bool(input.hasActorRole)}))\n(assert (= has_org_plan ${bool(input.hasOrgPlan)}))\n(assert (= is_registered_tool ${bool(input.isRegisteredTool)}))\n(assert (= action_matches_tool ${bool(input.actionMatchesTool)}))\n(assert (= actor_role_allowed ${bool(input.actorRoleAllowed)}))\n(assert (= plan_entitled ${bool(input.planEntitled)}))\n(assert (= risk ${input.risk}))\n(assert (= requires_approval ${bool(input.requiresApproval)}))\n(assert (= has_approval ${bool(input.hasApproval)}))\n(assert (= evidence_writable ${bool(input.evidenceWritable)}))\n\n(assert has_org)\n(assert has_actor)\n(assert has_actor_role)\n(assert has_org_plan)\n(assert is_registered_tool)\n(assert action_matches_tool)\n(assert actor_role_allowed)\n(assert plan_entitled)\n(assert evidence_writable)\n(assert (=> (or requires_approval (>= risk 2)) has_approval))\n\n(check-sat)\n(get-model)\n`;
}

function evaluate(input) {
  const violated = [];
  if (!input.hasOrg) violated.push('missing_org_id');
  if (!input.hasActor) violated.push('missing_actor_id');
  if (!input.hasActorRole) violated.push('missing_actor_role');
  if (!input.hasOrgPlan) violated.push('missing_org_plan');
  if (!input.isRegisteredTool) violated.push('tool_not_registered');
  if (!input.actionMatchesTool) violated.push('tool_action_mismatch');
  if (!input.actorRoleAllowed) violated.push('role_not_allowed');
  if (!input.planEntitled) violated.push('plan_not_entitled');
  if (!input.evidenceWritable) violated.push('evidence_not_writable');
  if ((input.requiresApproval || input.risk >= 2) && !input.hasApproval) violated.push('approval_required');

  const smt2 = renderSmt2(input);
  const smt2Hash = sha256(smt2);
  return {
    decision: violated.length === 0 ? 'allow' : 'block',
    violated,
    smt2,
    smt2Hash,
    resultHash: sha256(JSON.stringify({ violated, smt2Hash })),
  };
}

function renderReport(artifact) {
  const rows = artifact.results
    .map((result) => `| ${result.id} | ${result.pass ? 'PASS' : 'FAIL'} | ${result.expectedDecision} | ${result.observedDecision} | ${result.violated.join(', ') || 'none'} | ${result.smt2Hash.slice(0, 16)}… |`)
    .join('\n');

  return `# Gateway SMT2 Deterministic Invariant Report\n\nGenerated at: ${artifact.generatedAt}\n\n## Verdict\n\n**${artifact.summary.pass ? 'PASS' : 'FAIL'}**\n\n## Summary\n\n- Total: ${artifact.summary.total}\n- Passed: ${artifact.summary.passed}\n- Failed: ${artifact.summary.failed}\n- Pass rate: ${artifact.summary.passRate}\n\n## Cases\n\n| Case | Verdict | Expected | Observed | Violated invariants | SMT2 hash |\n|---|---:|---|---|---|---|\n${rows}\n\n## Evidence boundary\n\nThis verifier emits deterministic SMT-LIB v2-compatible constraint text and hashes the SMT2 input/result. The current script performs static invariant evaluation without invoking an external SMT solver. External Z3/cvc5 verification can be added later using the emitted SMT2 text.\n`;
}
