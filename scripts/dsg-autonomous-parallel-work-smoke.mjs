#!/usr/bin/env node

const fs = await import('node:fs/promises');

const files = [
  'lib/dsg/autonomous-level/sandbox-isolation-contract.ts',
  'lib/dsg/autonomous-level/repair-loop-contract.ts',
  'lib/dsg/autonomous-level/browser-session-contract.ts',
  'lib/dsg/autonomous-level/artifact-timeline-contract.ts',
  'lib/dsg/autonomous-level/preview-proof-contract.ts',
  'lib/dsg/autonomous-level/parallel-work-gate.ts',
];

for (const file of files) {
  await fs.access(file);
}

const combined = await Promise.all(files.map((file) => fs.readFile(file, 'utf8')));
const text = combined.join('\n');

const requiredTerms = [
  'evaluateSandboxIsolationProof',
  'evaluateRepairLoopProof',
  'evaluateBrowserSessionProof',
  'evaluateArtifactTimelineProof',
  'evaluatePreviewDeploymentProof',
  'evaluateDsgParallelAutonomousWork',
  'PROOF_REQUIRED',
  'DSG_AUTONOMOUS_RUNTIME_PROOF_INCOMPLETE',
];

for (const term of requiredTerms) {
  if (!text.includes(term)) throw new Error(`missing required term: ${term}`);
}

console.log('PASS: DSG autonomous parallel work smoke checks passed');
