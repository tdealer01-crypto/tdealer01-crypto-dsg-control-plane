#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const CONFIG_FILE = process.env.VENDOR_BENCHMARK_CONFIG || 'benchmarks/vendor-comparison/vendors.json';
const OUT_DIR = process.env.VENDOR_BENCHMARK_OUT_DIR || 'artifacts/vendor-comparison';
const HTTP_TIMEOUT_MS = Number(process.env.VENDOR_BENCHMARK_TIMEOUT_MS || 15000);

await main();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
  const results = [];

  for (const vendor of config.vendors) {
    const result = await runVendor(vendor);
    results.push(result);
  }

  const tested = results.filter((result) => result.status === 'tested');
  const passed = tested.filter((result) => result.pass).length;
  const manifest = {
    generatedAt: new Date().toISOString(),
    suiteId: config.suiteId,
    evidenceBoundary: config.evidenceBoundary,
    summary: {
      vendors: results.length,
      tested: tested.length,
      passed,
      failed: tested.length - passed,
      notConfigured: results.filter((result) => result.status === 'not_configured').length,
      skipped: results.filter((result) => result.status === 'skipped').length,
    },
    results,
  };

  await fs.writeFile(path.join(OUT_DIR, 'vendor-comparison-result.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'vendor-comparison-report.md'), renderReport(manifest));

  console.log(JSON.stringify(manifest.summary, null, 2));
}

async function runVendor(vendor) {
  if (vendor.id === 'dsg') {
    return runDsgBaseline(vendor);
  }

  const missingEnv = (vendor.requiredEnv || []).filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: 'not_configured',
      pass: false,
      reason: `Missing env: ${missingEnv.join(', ')}`,
      scoreEligible: false,
    };
  }

  if (vendor.id === 'temporal') {
    return runTemporalEndpoint(vendor, process.env.TEMPORAL_BENCHMARK_ENDPOINT);
  }

  const urlByVendor = {
    zapier: process.env.ZAPIER_BENCHMARK_WEBHOOK_URL,
    make: process.env.MAKE_BENCHMARK_WEBHOOK_URL,
    n8n: process.env.N8N_BENCHMARK_WEBHOOK_URL,
    workato: process.env.WORKATO_BENCHMARK_WEBHOOK_URL,
  };

  return runWebhookVendor(vendor, urlByVendor[vendor.id]);
}

async function runDsgBaseline(vendor) {
  const startedAt = Date.now();
  const output = await spawnProcess('npm', ['run', 'benchmark:evidence']);
  const latencyMs = Date.now() - startedAt;
  const fullEvidencePath = 'artifacts/full-evidence/dsg-full-evidence-manifest.json';
  const evidenceHash = await hashFileIfExists(fullEvidencePath);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: 'tested',
    pass: output.status === 0 && Boolean(evidenceHash),
    scoreEligible: true,
    mode: 'native_full_evidence',
    latencyMs,
    evidence: {
      command: 'npm run benchmark:evidence',
      artifact: fullEvidencePath,
      sha256: evidenceHash,
    },
    stdoutTail: tail(output.stdout),
    stderrTail: tail(output.stderr),
  };
}

async function runWebhookVendor(vendor, endpointUrl) {
  const startedAt = Date.now();
  const payload = benchmarkPayload(vendor.id);
  const response = await postJson(endpointUrl, payload);
  const latencyMs = Date.now() - startedAt;

  const evidence = {
    endpointConfigured: true,
    payloadHash: sha256(JSON.stringify(payload)),
    httpStatus: response.status,
    responseHash: sha256(JSON.stringify(response.body)),
  };

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: 'tested',
    pass: response.status >= 200 && response.status < 300,
    scoreEligible: response.status >= 200 && response.status < 300,
    mode: 'webhook_smoke',
    latencyMs,
    evidence,
    body: response.body,
  };
}

async function runTemporalEndpoint(vendor, endpointUrl) {
  const startedAt = Date.now();
  const payload = benchmarkPayload(vendor.id);
  const response = await postJson(endpointUrl, payload);
  const latencyMs = Date.now() - startedAt;

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: 'tested',
    pass: response.status >= 200 && response.status < 300,
    scoreEligible: response.status >= 200 && response.status < 300,
    mode: 'durable_execution_endpoint_smoke',
    latencyMs,
    evidence: {
      endpointConfigured: true,
      payloadHash: sha256(JSON.stringify(payload)),
      httpStatus: response.status,
      responseHash: sha256(JSON.stringify(response.body)),
    },
    body: response.body,
  };
}

function benchmarkPayload(vendorId) {
  return {
    suiteId: 'dsg-vendor-comparison-harness-v1',
    vendorId,
    timestamp: new Date().toISOString(),
    workload: {
      type: 'governed_action_smoke',
      orgId: 'org-benchmark',
      actorId: 'benchmark-agent',
      actorRole: 'agent_operator',
      toolName: 'benchmark.customer_webhook',
      action: 'post',
      risk: 'medium',
      input: {
        message: 'Vendor comparison smoke payload',
      },
    },
    requiredEvidence: [
      'http_2xx_response',
      'latency_ms',
      'payload_hash',
      'response_hash',
    ],
  };
}

async function postJson(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    return { status: response.status, body };
  } catch (error) {
    return { status: 0, body: { error: error instanceof Error ? error.message : String(error) } };
  } finally {
    clearTimeout(timeout);
  }
}

function spawnProcess(bin, args) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('close', (status) => resolve({ status: status ?? 1, stdout, stderr }));
  });
}

async function hashFileIfExists(file) {
  try {
    const content = await fs.readFile(file);
    return sha256(content);
  } catch {
    return null;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function tail(value, max = 1200) {
  if (!value) return '';
  return value.length > max ? value.slice(value.length - max) : value;
}

function renderReport(manifest) {
  const rows = manifest.results
    .map((result) => `| ${result.vendorName} | ${result.status} | ${result.pass ? 'PASS' : '—'} | ${result.scoreEligible ? 'yes' : 'no'} | ${result.latencyMs ?? '—'} | ${result.reason || ''} |`)
    .join('\n');

  return `# Vendor Comparison Harness Report\n\nGenerated at: ${manifest.generatedAt}\n\n## Evidence boundary\n\n${manifest.evidenceBoundary}\n\n## Summary\n\n- Vendors: ${manifest.summary.vendors}\n- Tested: ${manifest.summary.tested}\n- Passed: ${manifest.summary.passed}\n- Failed: ${manifest.summary.failed}\n- Not configured: ${manifest.summary.notConfigured}\n- Skipped: ${manifest.summary.skipped}\n\n## Results\n\n| Vendor | Status | Result | Score eligible | Latency ms | Note |\n|---|---|---:|---:|---:|---|\n${rows}\n\n## Notes\n\nOnly vendors with status \`tested\` and scoreEligible \`yes\` should be scored in a same-suite comparison. not_configured vendors are placeholders until credentials/endpoints are provided.\n`;
}
