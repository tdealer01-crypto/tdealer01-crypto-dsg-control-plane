#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = process.env.DSG_FULL_EVIDENCE_OUT_DIR || 'artifacts/full-evidence';
const FORMAL_VERIFICATION_DOI = 'https://doi.org/10.5281/zenodo.18225586';

const steps = [
  {
    id: 'production_gateway_benchmark',
    label: 'Production Gateway Benchmark',
    command: ['npm', ['run', 'benchmark:gateway']],
    expectedFiles: [
      'artifacts/gateway-benchmark/gateway-benchmark-result.json',
      'artifacts/gateway-benchmark/gateway-benchmark-report.md',
    ],
  },
  {
    id: 'market_comparison_score',
    label: 'Market Comparison Score',
    command: ['npm', ['run', 'benchmark:gateway:compare']],
    expectedFiles: [
      'artifacts/gateway-comparison/gateway-comparison-result.json',
      'artifacts/gateway-comparison/gateway-comparison-report.md',
    ],
  },
  {
    id: 'smt2_runtime_invariants',
    label: 'SMT2 Runtime Invariants',
    command: ['npm', ['run', 'benchmark:gateway:smt2']],
    expectedFiles: [
      'artifacts/gateway-smt2/gateway-smt2-invariants-result.json',
      'artifacts/gateway-smt2/gateway-smt2-invariants-report.md',
    ],
  },
];

await main();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const stepResults = [];

  for (const step of steps) {
    const result = await runStep(step);
    stepResults.push(result);
    if (!result.pass) {
      break;
    }
  }

  const evidenceFiles = await collectEvidenceFiles(stepResults.flatMap((step) => step.expectedFiles));
  const passed = stepResults.filter((step) => step.pass).length;
  const summary = {
    pass: passed === steps.length,
    total: steps.length,
    passed,
    failed: steps.length - passed,
    passRate: `${Math.round((passed / steps.length) * 100)}%`,
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    startedAt,
    suite: 'dsg-full-evidence-benchmark-v1',
    formalVerification: {
      doi: FORMAL_VERIFICATION_DOI,
      scope: 'Published formal verification artifact for Deterministic State Gate (DSG).',
      boundary: 'The DOI artifact is the formal verification evidence. Runtime benchmark outputs in this repository provide deployment-specific evidence and do not replace the published proof artifact.',
    },
    summary,
    steps: stepResults,
    evidenceFiles,
  };

  await fs.writeFile(path.join(OUT_DIR, 'dsg-full-evidence-manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'dsg-full-evidence-report.md'), renderReport(manifest));

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) {
    process.exitCode = 1;
  }
}

async function runStep(step) {
  const [bin, args] = step.command;
  const startedAt = Date.now();
  const output = await spawnProcess(bin, args);
  const latencyMs = Date.now() - startedAt;
  const expectedFiles = [];

  for (const file of step.expectedFiles) {
    expectedFiles.push({
      path: file,
      exists: await fileExists(file),
    });
  }

  return {
    id: step.id,
    label: step.label,
    command: `${bin} ${args.join(' ')}`,
    status: output.status,
    pass: output.status === 0 && expectedFiles.every((file) => file.exists),
    latencyMs,
    expectedFiles,
    stdoutTail: tail(output.stdout),
    stderrTail: tail(output.stderr),
  };
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

    child.on('close', (status) => {
      resolve({ status: status ?? 1, stdout, stderr });
    });
  });
}

async function collectEvidenceFiles(files) {
  const collected = [];
  for (const file of files) {
    if (!(await fileExists(file))) {
      collected.push({ path: file, exists: false });
      continue;
    }

    const content = await fs.readFile(file);
    collected.push({
      path: file,
      exists: true,
      sizeBytes: content.length,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
    });
  }
  return collected;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function tail(value, max = 1600) {
  if (!value) return '';
  return value.length > max ? value.slice(value.length - max) : value;
}

function renderReport(manifest) {
  const stepRows = manifest.steps.map((step) => `| ${step.label} | ${step.pass ? 'PASS' : 'FAIL'} | ${step.status} | ${step.latencyMs} |`).join('\n');
  const evidenceRows = manifest.evidenceFiles.map((file) => `| ${file.path} | ${file.exists ? 'yes' : 'no'} | ${file.sizeBytes ?? '—'} | ${file.sha256 ? `${file.sha256.slice(0, 16)}…` : '—'} |`).join('\n');

  return `# DSG Full Evidence Benchmark Report\n\nGenerated at: ${manifest.generatedAt}\n\n## Verdict\n\n**${manifest.summary.pass ? 'PASS' : 'FAIL'}**\n\n## Summary\n\n- Total suites: ${manifest.summary.total}\n- Passed: ${manifest.summary.passed}\n- Failed: ${manifest.summary.failed}\n- Pass rate: ${manifest.summary.passRate}\n\n## Formal verification reference\n\n- DOI: ${manifest.formalVerification.doi}\n- Scope: ${manifest.formalVerification.scope}\n- Boundary: ${manifest.formalVerification.boundary}\n\n## Suite steps\n\n| Step | Verdict | Exit status | Runtime ms |\n|---|---:|---:|---:|\n${stepRows}\n\n## Evidence artifacts\n\n| File | Exists | Size bytes | SHA-256 |\n|---|---:|---:|---|\n${evidenceRows}\n\n## Evidence boundary\n\nThis full evidence pack combines production benchmark evidence, comparison scoring evidence, SMT2-compatible runtime invariant evidence, and the published formal verification DOI reference. It does not claim independent third-party certification of the deployed SaaS runtime.\n`;
}
