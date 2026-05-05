#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const CASES_FILE = process.env.KAGGLE_COMMUNITY_CASES_FILE || 'benchmarks/kaggle-community/benchmark_cases.json';
const TASKS_FILE = process.env.KAGGLE_COMMUNITY_TASKS_FILE || 'benchmarks/kaggle-community/dsg_finance_governance_tasks.py';
const OUT_DIR = process.env.KAGGLE_COMMUNITY_OUT_DIR || 'artifacts/kaggle-community-showcase';

await main();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const casesRaw = await fs.readFile(CASES_FILE, 'utf8');
  const tasksRaw = await fs.readFile(TASKS_FILE, 'utf8');
  const casesDoc = JSON.parse(casesRaw);
  const flatCases = casesDoc.tasks.flatMap((task) => task.cases.map((testCase) => ({ task, testCase })));

  const taskSummaries = casesDoc.tasks.map((task) => ({
    taskId: task.task_id,
    name: task.name,
    maxScore: task.max_score,
    caseCount: task.cases.length,
    copyPasteReady: true,
  }));

  const checks = {
    suiteIdPresent: typeof casesDoc.suite_id === 'string' && casesDoc.suite_id.length > 0,
    titlePresent: typeof casesDoc.title === 'string' && casesDoc.title.length > 0,
    evidenceBoundaryPresent: typeof casesDoc.evidence_boundary === 'string' && casesDoc.evidence_boundary.includes('not an independent third-party audit'),
    taskCountAtLeast3: casesDoc.tasks.length >= 3,
    allTasksHaveCases: casesDoc.tasks.every((task) => Array.isArray(task.cases) && task.cases.length > 0),
    allCasesHaveExpectedGate: flatCases.every(({ testCase }) => Boolean(testCase.expected?.gate_status)),
    allCasesHaveRiskLevel: flatCases.every(({ testCase }) => Boolean(testCase.expected?.risk_level)),
    pythonHasTaskFunctions: ['payment_decision_control_task', 'policy_compliance_detection_task', 'audit_evidence_generation_task'].every((name) => tasksRaw.includes(`def ${name}`)),
    pythonHasEvidenceBoundary: tasksRaw.includes('not independent third-party audit certification') || tasksRaw.includes('not an independent'),
  };

  const summary = {
    pass: Object.values(checks).every(Boolean),
    suiteId: casesDoc.suite_id,
    title: casesDoc.title,
    taskCount: casesDoc.tasks.length,
    caseCount: flatCases.length,
    taskSummaries,
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    summary,
    checks,
    sourceFiles: [
      await fileInfo(CASES_FILE, casesRaw),
      await fileInfo(TASKS_FILE, tasksRaw),
    ],
    kaggleSetup: {
      taskDefinition: 'Kaggle Benchmark task = Python function defining the problem and scoring behavior.',
      benchmarkDefinition: 'Kaggle Benchmark = UI collection of one or more saved tasks plus selected models.',
      nextSteps: [
        'Open Kaggle Benchmarks and create a task for DSG-TASK-001.',
        'Copy the relevant Python task function from dsg_finance_governance_tasks.py into the task notebook.',
        'Save the task, repeat for DSG-TASK-002 and DSG-TASK-003, then create a benchmark collection in the Kaggle UI.',
        'Add supported Kaggle Community Benchmark models and run evaluations before making leaderboard claims.',
      ],
    },
    evidenceBoundary: casesDoc.evidence_boundary,
  };

  await fs.writeFile(path.join(OUT_DIR, 'kaggle-community-showcase-manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'kaggle-community-showcase-report.md'), renderReport(manifest));
  await fs.writeFile(path.join(OUT_DIR, 'kaggle-file-information.md'), renderFileInformation());
  await fs.writeFile(path.join(OUT_DIR, 'README-kaggle-copy.md'), renderDatasetReadme(casesDoc));

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) {
    process.exitCode = 1;
  }
}

async function fileInfo(filePath, content) {
  return {
    path: filePath,
    exists: true,
    sizeBytes: Buffer.byteLength(content),
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

function renderReport(manifest) {
  const taskRows = manifest.summary.taskSummaries
    .map((task) => `| ${task.taskId} | ${task.name} | ${task.caseCount} | ${task.maxScore} | ${task.copyPasteReady ? 'yes' : 'no'} |`)
    .join('\n');
  const checkRows = Object.entries(manifest.checks)
    .map(([key, value]) => `| ${key} | ${value ? 'PASS' : 'FAIL'} |`)
    .join('\n');
  const fileRows = manifest.sourceFiles
    .map((file) => `| ${file.path} | ${file.sizeBytes} | ${file.sha256.slice(0, 16)}… |`)
    .join('\n');

  return `# DSG Kaggle Community Benchmark Showcase\n\nGenerated at: ${manifest.generatedAt}\n\n## Verdict\n\n**${manifest.summary.pass ? 'PASS' : 'FAIL'}**\n\n## Summary\n\n- Suite: ${manifest.summary.suiteId}\n- Tasks: ${manifest.summary.taskCount}\n- Cases: ${manifest.summary.caseCount}\n\n## Task pack\n\n| Task ID | Name | Cases | Max score | Copy-paste ready |\n|---|---|---:|---:|---:|\n${taskRows}\n\n## Validation checks\n\n| Check | Result |\n|---|---:|\n${checkRows}\n\n## Source file hashes\n\n| File | Size bytes | SHA-256 |\n|---|---:|---|\n${fileRows}\n\n## Kaggle setup boundary\n\n- Task: ${manifest.kaggleSetup.taskDefinition}\n- Benchmark: ${manifest.kaggleSetup.benchmarkDefinition}\n\n## Next steps\n\n${manifest.kaggleSetup.nextSteps.map((step) => `- ${step}`).join('\n')}\n\n## Evidence boundary\n\n${manifest.evidenceBoundary}\n`;
}

function renderFileInformation() {
  return `# Kaggle file information copy\n\nUse these descriptions in Kaggle's Add file information panel.\n\n## README.md\nPrimary dataset documentation. Explains dataset purpose, contents, benchmark task scope, local test evidence, provenance, DOI references, and evidence boundary. Read this file first.\n\n## benchmarks/kaggle-community/benchmark_cases.json\nDeterministic Community Benchmark preparation cases for DSG financial governance tasks. Includes task IDs, prompts, expected gate status, risk level, required evidence terms, forbidden false-claim terms, and evidence boundary.\n\n## benchmarks/kaggle-community/dsg_finance_governance_tasks.py\nKaggle task-ready Python scoring functions for Payment Decision Control, Policy Compliance Detection, and Audit Evidence Generation. Copy individual functions into Kaggle Benchmark task notebooks.\n\n## artifacts/kaggle-community-showcase/kaggle-community-showcase-manifest.json\nGenerated manifest validating the Kaggle Community Benchmark task pack structure, source file hashes, task counts, case counts, and claim boundary.\n\n## artifacts/kaggle-community-showcase/kaggle-community-showcase-report.md\nHuman-readable showcase report summarizing tasks, validation checks, source hashes, Kaggle setup steps, and evidence boundary.\n\n## artifacts/kaggle-community-showcase/README-kaggle-copy.md\nREADME text prepared for Kaggle dataset/notebook publication. It separates author-generated evidence from public Kaggle leaderboard results.\n`;
}

function renderDatasetReadme(casesDoc) {
  const taskRows = casesDoc.tasks
    .map((task) => `| ${task.task_id} | ${task.name} | ${task.cases.length} | ${task.max_score} |`)
    .join('\n');

  return `# DSG Finance Governance Community Benchmark Pack\n\nThis pack provides task-ready materials for creating a Kaggle Community Benchmark around DSG financial governance behavior.\n\n## Evidence Boundary\n\n${casesDoc.evidence_boundary}\n\n## What this pack evaluates\n\n- Payment decision control\n- Policy compliance detection\n- Audit evidence generation\n- False production/completion claim detection\n- Governance evidence boundary correctness\n\n## Tasks\n\n| Task ID | Task | Cases | Max Score |\n|---|---|---:|---:|\n${taskRows}\n\n## How to use on Kaggle\n\n1. Open Kaggle Benchmarks and create a task.\n2. Copy one Python task function from \`benchmarks/kaggle-community/dsg_finance_governance_tasks.py\`.\n3. Save the task in Kaggle.\n4. Repeat for the remaining DSG tasks.\n5. Create a benchmark collection in Kaggle UI.\n6. Add supported Kaggle Community Benchmark models and run evaluations.\n7. Only after evaluated runs appear on the Kaggle leaderboard, claim public leaderboard results.\n\n## Safe claim\n\nDSG provides a DOI-published evidence pack and task-ready Kaggle Community Benchmark materials for financial governance evaluation. Public Kaggle leaderboard validation remains pending until saved tasks and evaluated model runs are completed inside Kaggle.\n\n## Not claimed\n\n- independent third-party audit certification\n- official Kaggle leaderboard result before model evaluation\n- ISO certification\n- bank certification\n- guaranteed compliance\n`;
}
