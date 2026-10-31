import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../skills/dsg-production-gate/scripts/dsg-production-gate.mjs', import.meta.url));
const script = readFileSync(cli, 'utf8');

function check(fields = {}) {
  // Never inherit an actual production credential from CI or operator shell.
  const env = {
    PATH: process.env.PATH || '',
    NODE_ENV: 'test',
    ...fields,
  };
  return spawnSync(process.execPath, [cli, 'evaluate'], {
    cwd: root, env, encoding: 'utf8', timeout: 5_000,
  });
}

describe('DSG production gate origin and credential safety', () => {
  it('denies missing active URL before loading a credential', () => {
    const result = check({ DSG_API_KEY: 'fake-test-key', DSG_TRUSTED_GATE_ORIGIN: 'https://active.example.test' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Explicit DSG_CONTROL_PLANE_URL/);
  });
  it('denies missing independently pinned origin', () => {
    const result = check({ DSG_API_KEY: 'fake-test-key', DSG_CONTROL_PLANE_URL: 'https://active.example.test' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DSG_TRUSTED_GATE_ORIGIN/);
  });
  it('denies retired Render and Vercel gateways even when they match the pin', () => {
    for (const url of ['https://tdealer01-crypto-dsg-control-plane.onrender.com', 'https://tdealer01-crypto-dsg-control-plane.vercel.app']) {
      const r = check({ DSG_API_KEY: 'fake-test-key', DSG_CONTROL_PLANE_URL: url, DSG_TRUSTED_GATE_ORIGIN: url });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /retired/);
    }
  });
  it('denies mismatched, insecure or credential-bearing destinations', () => {
    const cases = [
      ['https://evil.example.test', 'https://active.example.test'],
      ['http://active.example.test', 'http://active.example.test'],
      ['https://user:pass@active.example.test', 'https://active.example.test'],
      ['https://active.example.test/other-path', 'https://active.example.test'],
      ['https://active.example.test?token=wrong', 'https://active.example.test'],
    ];
    for (const [url, pin] of cases) {
      const r = check({ DSG_API_KEY: 'fake-test-key', DSG_CONTROL_PLANE_URL: url, DSG_TRUSTED_GATE_ORIGIN: pin });
      assert.notEqual(r.status, 0, url);
    }
  });
  it('accepts a matching explicit HTTPS origin then still requires scoped credentials', () => {
    const r = check({ DSG_CONTROL_PLANE_URL: 'https://active.example.test', DSG_TRUSTED_GATE_ORIGIN: 'https://active.example.test' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /DSG_API_KEY is required/);
  });
  it('forbids redirect following with bearer credentials', () => {
    assert.match(script, /redirect:\s*'error'/);
    assert.doesNotMatch(script, /process\.env\.DSG_CONTROL_PLANE_URL\?\.trim\(\)\s*\|\|/);
  });
  it('revenue OIDC dispatch has an independent pre-token active origin gate', () => {
    const flow = readFileSync(new URL('../../.github/workflows/revenue-autopilot.yml', import.meta.url), 'utf8');
    const preflight = flow.indexOf('Validate active revenue endpoint before requesting GitHub OIDC token');
    const token = flow.indexOf('- name: Request GitHub OIDC token');
    assert.ok(preflight > 0 && token > preflight);
    assert.ok(flow.includes('AUTOPILOT_URL: ${{ vars.DSG_REVENUE_AUTOPILOT_URL }}'));
    assert.ok(flow.includes('AUTOPILOT_TRUSTED_ORIGIN: ${{ vars.DSG_TRUSTED_REVENUE_ORIGIN }}'));
    assert.ok(flow.includes("url.pathname !== '/api/cron/revenue-autopilot'"));
    assert.ok(!flow.includes('AUTOPILOT_URL: https://tdealer01-crypto-dsg-control-plane'));
    assert.ok(!flow.includes('--retry-all-errors'));
  });

  it('workflow validates exact pinned origin before injecting DSG_API_KEY', () => {
    const workflow = readFileSync(new URL('../../.github/workflows/verified-software-e2e.yml', import.meta.url), 'utf8');
    const preflight = workflow.indexOf('Validate pinned active DSG gate origin before loading credentials');
    const credential = workflow.indexOf('- name: Require real DSG credential');
    assert.ok(preflight > 0 && credential > preflight);
    assert.match(workflow, /DSG_TRUSTED_GATE_ORIGIN: \$\{\{ vars\.DSG_TRUSTED_GATE_ORIGIN \}\}/);
  });
});
