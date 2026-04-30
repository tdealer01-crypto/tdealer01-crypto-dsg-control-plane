#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.GATEWAY_BENCHMARK_BASE_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app').replace(/\/$/, '');
const ORG_ID = process.env.GATEWAY_BENCHMARK_ORG_ID || 'org-smoke';
const OUT_DIR = process.env.GATEWAY_BENCHMARK_OUT_DIR || 'artifacts/gateway-benchmark';
const CONNECTOR_ENDPOINT = process.env.GATEWAY_BENCHMARK_CONNECTOR_ENDPOINT || `${BASE_URL}/api/gateway/webhook/inbox`;

const runStartedAt = new Date().toISOString();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const steps = [];
  const register = await timedStep('register_connector', () => registerConnector());
  steps.push(register);

  const execute = await timedStep('gateway_execute_custom_http', () => executeGatewayTool());
  steps.push(execute);

  const planCheck = await timedStep('monitor_plan_check', () => monitorPlanCheck());
  steps.push(planCheck);

  const auditToken = planCheck.body?.auditToken;
  const commit = await timedStep('monitor_audit_commit', () => auditCommit(auditToken));
  steps.push(commit);

  const events = await timedStep('audit_events', () => getAuditEvents());
  steps.push(events);

  const auditExport = await timedStep('audit_export', () => getAuditExport());
  steps.push(auditExport);

  const summary = summarize(steps);
  const artifact = {
    meta: {
      generatedAt: runStartedAt,
      baseUrl: BASE_URL,
      orgId: ORG_ID,
      connectorEndpoint: CONNECTOR_ENDPOINT,
    },
    summary,
    checks: buildChecks(steps),
    steps,
  };

  await fs.writeFile(path.join(OUT_DIR, 'gateway-benchmark-result.json'), JSON.stringify(artifact, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'gateway-benchmark-report.md'), renderReport(artifact));

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) {
    process.exitCode = 1;
  }
}

async function registerConnector() {
  return post('/api/gateway/connectors', {
    headers: adminHeaders(),
    body: {
      name: 'Internal gateway benchmark inbox',
      endpointUrl: CONNECTOR_ENDPOINT,
      toolName: 'custom_http.customer_webhook',
      action: 'post',
      risk: 'medium',
      requiresApproval: false,
      description: 'Production benchmark POST receiver',
    },
  });
}

async function executeGatewayTool() {
  return post('/api/gateway/tools/execute', {
    headers: agentHeaders(),
    body: {
      toolName: 'custom_http.customer_webhook',
      action: 'post',
      planId: `PLAN-BENCH-GATEWAY-${Date.now()}`,
      input: {
        message: 'DSG production benchmark gateway execution',
        benchmark: true,
      },
    },
  });
}

async function monitorPlanCheck() {
  return post('/api/gateway/plan-check', {
    headers: agentHeaders(),
    body: {
      toolName: 'custom_http.customer_webhook',
      action: 'post',
      planId: `PLAN-BENCH-MONITOR-${Date.now()}`,
      input: {
        message: 'DSG production benchmark monitor plan check',
        benchmark: true,
      },
    },
  });
}

async function auditCommit(auditToken) {
  if (!auditToken) {
    return {
      ok: false,
      status: 0,
      body: { error: 'missing_audit_token_from_plan_check' },
    };
  }

  return post('/api/gateway/audit/commit', {
    headers: {
      'content-type': 'application/json',
      'x-org-id': ORG_ID,
    },
    body: {
      auditToken,
      result: {
        ok: true,
        provider: 'customer_runtime',
        target: 'customer.tool',
        messageId: `bench_${Date.now()}`,
      },
    },
  });
}

async function getAuditEvents() {
  return get(`/api/gateway/audit/events?orgId=${encodeURIComponent(ORG_ID)}&limit=10`, {
    headers: { 'x-org-id': ORG_ID },
  });
}

async function getAuditExport() {
  return get(`/api/gateway/audit/export?orgId=${encodeURIComponent(ORG_ID)}`, {
    headers: { 'x-org-id': ORG_ID },
  });
}

function adminHeaders() {
  return {
    'content-type': 'application/json',
    'x-org-id': ORG_ID,
    'x-actor-id': 'benchmark-admin',
    'x-actor-role': 'admin',
  };
}

function agentHeaders() {
  return {
    'content-type': 'application/json',
    'x-org-id': ORG_ID,
    'x-actor-id': 'benchmark-agent',
    'x-actor-role': 'agent_operator',
    'x-org-plan': 'enterprise',
  };
}

async function timedStep(name, fn) {
  const startedAt = Date.now();
  const startedAtIso = new Date().toISOString();
  let response;
  try {
    response = await fn();
  } catch (error) {
    response = {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
  const finishedAt = Date.now();

  return {
    name,
    startedAt: startedAtIso,
    latencyMs: finishedAt - startedAt,
    status: response.status,
    httpOk: response.status >= 200 && response.status < 300,
    body: response.body,
    pass: stepPass(name, response),
  };
}

function stepPass(name, response) {
  const body = response.body || {};
  if (!(response.status >= 200 && response.status < 300)) return false;

  if (name === 'register_connector') return body.ok === true && body.connector && body.tool;
  if (name === 'gateway_execute_custom_http') return body.ok === true && body.providerResult?.ok === true && Boolean(body.audit?.requestHash) && Boolean(body.audit?.recordHash);
  if (name === 'monitor_plan_check') return body.ok === true && body.decision === 'allow' && Boolean(body.auditToken) && Boolean(body.requestHash) && Boolean(body.recordHash);
  if (name === 'monitor_audit_commit') return body.ok === true && body.committed === true && Boolean(body.recordHash);
  if (name === 'audit_events') return body.ok === true && Array.isArray(body.events) && body.events.length > 0;
  if (name === 'audit_export') return body.ok === true && Array.isArray(body.events) && body.count > 0;

  return body.ok === true;
}

function summarize(steps) {
  const total = steps.length;
  const passed = steps.filter((step) => step.pass).length;
  const latencies = steps.map((step) => step.latencyMs);
  const sorted = [...latencies].sort((a, b) => a - b);
  const avgLatencyMs = Math.round(latencies.reduce((sum, value) => sum + value, 0) / Math.max(total, 1));

  return {
    pass: passed === total,
    total,
    passed,
    failed: total - passed,
    passRate: `${Math.round((passed / Math.max(total, 1)) * 100)}%`,
    avgLatencyMs,
    minLatencyMs: sorted[0] ?? 0,
    maxLatencyMs: sorted[sorted.length - 1] ?? 0,
  };
}

function buildChecks(steps) {
  const byName = Object.fromEntries(steps.map((step) => [step.name, step]));
  return {
    connectorRegistry: byName.register_connector?.pass === true,
    gatewayExecution: byName.gateway_execute_custom_http?.pass === true,
    monitorPlanCheck: byName.monitor_plan_check?.pass === true,
    auditCommit: byName.monitor_audit_commit?.pass === true,
    auditEvents: byName.audit_events?.pass === true,
    auditExport: byName.audit_export?.pass === true,
    requestHashPresent: Boolean(byName.gateway_execute_custom_http?.body?.audit?.requestHash) && Boolean(byName.monitor_plan_check?.body?.requestHash),
    recordHashPresent: Boolean(byName.gateway_execute_custom_http?.body?.audit?.recordHash) && Boolean(byName.monitor_audit_commit?.body?.recordHash),
  };
}

function renderReport(artifact) {
  const rows = artifact.steps.map((step) => `| ${step.name} | ${step.pass ? 'PASS' : 'FAIL'} | ${step.status} | ${step.latencyMs} |`).join('\n');
  const checks = Object.entries(artifact.checks).map(([key, value]) => `- ${key}: **${value ? 'PASS' : 'FAIL'}**`).join('\n');

  return `# DSG Gateway Production Benchmark Evidence\n\nGenerated at: ${artifact.meta.generatedAt}\n\n## Target\n\n- Base URL: \`${artifact.meta.baseUrl}\`\n- Org ID: \`${artifact.meta.orgId}\`\n- Connector endpoint: \`${artifact.meta.connectorEndpoint}\`\n\n## Verdict\n\n**${artifact.summary.pass ? 'PASS' : 'FAIL'}**\n\n## Summary\n\n- Pass rate: **${artifact.summary.passRate}**\n- Passed: **${artifact.summary.passed}/${artifact.summary.total}**\n- Average latency: **${artifact.summary.avgLatencyMs} ms**\n- Min latency: **${artifact.summary.minLatencyMs} ms**\n- Max latency: **${artifact.summary.maxLatencyMs} ms**\n\n## Checks\n\n${checks}\n\n## Steps\n\n| Step | Verdict | HTTP Status | Latency ms |\n|---|---:|---:|---:|\n${rows}\n\n## Evidence Boundary\n\nThis benchmark verifies the public DSG Gateway production flow: connector registration, gateway execution, monitor plan-check, audit commit, audit events, and audit export. It is not a third-party certification.\n`;
}

async function post(pathname, { headers, body }) {
  return request(pathname, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function get(pathname, { headers }) {
  return request(pathname, {
    method: 'GET',
    headers,
  });
}

async function request(pathname, init) {
  const response = await fetch(`${BASE_URL}${pathname}`, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
