#!/usr/bin/env npx tsx
/**
 * scripts/z3-gate-verify.ts — post-deploy production verification.
 *
 * Referenced by .github/workflows/dsg-deploy.yml (job "Verify Production Deploy").
 * Runs after the production deploy (performed by the Vercel Git integration) and
 * confirms the live control plane is healthy AND that the deterministic gate
 * invariants still hold on the deployed code.
 *
 * Two layers:
 *   1. Live production probes — GET /api/health and /api/agent/status on the
 *      target base URL, with retries so a just-finished deploy has time to
 *      become reachable. Asserts health 200, ok=true, and (for --env=production)
 *      env === "production".
 *   2. Deterministic gate invariants — exercises lib/dsg/deterministic to assert
 *      the PASS/BLOCK/REVIEW mapping, UNSUPPORTED-is-never-PASS, and determinism.
 *
 * Usage:
 *   npx tsx scripts/z3-gate-verify.ts --env=production
 *   npx tsx scripts/z3-gate-verify.ts --url=https://example.vercel.app
 *
 * Claim boundary (CLAUDE.md §12): no external production Z3 solver is assumed.
 * Exits non-zero on any failed check and writes artifacts/z3-gate/verify-result.json.
 */

import fs from 'node:fs';
import path from 'node:path';

import { evaluateDeterministicGate, proofToGateStatus } from '../lib/dsg/deterministic/gate-engine';
import { proveDeterministicPlan } from '../lib/dsg/deterministic/proof-engine';
import { getDeterministicPolicyManifest } from '../lib/dsg/deterministic/policy-manifest';
import type { DeterministicProofRequest } from '../lib/dsg/deterministic/types';

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

const DEFAULT_PRODUCTION_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

function parseArgs(argv: string[]): { env: string; baseUrl: string } {
  let env = 'production';
  let url = '';
  for (const arg of argv) {
    if (arg.startsWith('--env=')) env = arg.slice('--env='.length);
    else if (arg.startsWith('--url=')) url = arg.slice('--url='.length);
  }
  const baseUrl = (url || process.env.DSG_CONTROL_PLANE_BASE_URL || DEFAULT_PRODUCTION_URL).replace(/\/+$/, '');
  return { env, baseUrl };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch with a few retries so a just-completed deploy has time to become reachable. */
async function fetchWithRetry(url: string, attempts = 5, delayMs = 6000): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'dsg-z3-gate-verify' } });
      if (res.ok) return res;
      if (i < attempts - 1) await sleep(delayMs);
    } catch {
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  return null;
}

const manifest = getDeterministicPolicyManifest();

function requestWith(overrides: { false?: string[]; nonceSuffix?: string; riskLevel?: DeterministicProofRequest['riskLevel'] }): DeterministicProofRequest {
  const falseKeys = new Set(overrides.false ?? []);
  const context: Record<string, unknown> = {};
  for (const constraint of manifest.constraints) context[constraint.evidenceKey] = !falseKeys.has(constraint.evidenceKey);
  const suffix = overrides.nonceSuffix ?? 'base';
  return {
    planId: `z3-gate-verify-${suffix}`,
    riskLevel: overrides.riskLevel ?? 'high',
    nonce: `z3-gate-verify-nonce-${suffix}`,
    idempotencyKey: `z3-gate-verify-idem-${suffix}`,
    context,
  };
}

async function verifyLiveProduction(env: string, baseUrl: string): Promise<void> {
  // Health probe.
  const healthUrl = `${baseUrl}/api/health`;
  const health = await fetchWithRetry(healthUrl);
  record('production /api/health reachable (200)', Boolean(health), health ? `HTTP ${health.status} ${healthUrl}` : `unreachable ${healthUrl}`);

  // Identity / status probe.
  const statusUrl = `${baseUrl}/api/agent/status`;
  const statusRes = await fetchWithRetry(statusUrl);
  if (!statusRes) {
    record('production /api/agent/status reachable', false, `unreachable ${statusUrl}`);
    return;
  }
  let status: { ok?: boolean; env?: string; commit?: string; checks?: { db?: boolean } } = {};
  try {
    status = (await statusRes.json()) as typeof status;
  } catch {
    record('production /api/agent/status JSON', false, 'invalid JSON');
    return;
  }
  record('production status ok=true', status.ok === true, `ok=${status.ok} commit=${(status.commit ?? '').slice(0, 8)}`);
  if (env === 'production') {
    record('production env === "production"', status.env === 'production', `env=${status.env}`);
  }
}

async function verifyDeterministicInvariants(): Promise<void> {
  const passGate = await evaluateDeterministicGate(requestWith({ nonceSuffix: 'pass' }));
  record('deterministic full-context PASS', passGate.gateStatus === 'PASS' && passGate.ok, `gateStatus=${passGate.gateStatus}`);

  const blockGate = await evaluateDeterministicGate(requestWith({ false: ['permission_granted'], nonceSuffix: 'block' }));
  record('deterministic missing-critical BLOCK', !blockGate.ok && blockGate.gateStatus === 'BLOCK', `gateStatus=${blockGate.gateStatus}`);

  const low = proofToGateStatus('UNSUPPORTED', 'low');
  const high = proofToGateStatus('UNSUPPORTED', 'high');
  record('deterministic UNSUPPORTED never PASS', low === 'REVIEW' && high === 'BLOCK', `low=${low} high=${high}`);

  const a = await proveDeterministicPlan(requestWith({ nonceSuffix: 'det' }));
  const b = await proveDeterministicPlan(requestWith({ nonceSuffix: 'det' }));
  record('deterministic proofHash stable', a.proofHash === b.proofHash, a.proofHash === b.proofHash ? 'stable' : 'DIVERGED');
}

async function run(): Promise<void> {
  const { env, baseUrl } = parseArgs(process.argv.slice(2));
  await verifyLiveProduction(env, baseUrl);
  await verifyDeterministicInvariants();

  const failures = results.filter((r) => !r.ok);
  const summary = {
    schema: 'dsg-z3-gate-verify-v1',
    ok: failures.length === 0,
    env,
    baseUrl,
    checkedAt: new Date().toISOString(),
    policyVersion: manifest.policyVersion,
    constraintSetHash: manifest.constraintSetHash,
    externalZ3ProductionSolverClaim: false,
    totalChecks: results.length,
    failedChecks: failures.length,
    checks: results,
    userOutcome:
      failures.length === 0
        ? `Production deploy verified: live ${baseUrl} healthy and deterministic gate invariants hold.`
        : 'Production deploy verification failed. Inspect failing checks.',
  };

  const outDir = path.join('artifacts', 'z3-gate');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'verify-result.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) process.exit(1);
}

run().catch((error) => {
  console.error('[z3-gate-verify] Unexpected error:', error);
  process.exit(1);
});
