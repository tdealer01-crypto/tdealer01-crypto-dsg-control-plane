#!/usr/bin/env node

import fs from 'node:fs';

const routeChecks = [
  { route: '/ai-compliance', file: 'app/ai-compliance/page.tsx', outcome: 'Compliance landing page is reachable.' },
  { route: '/iso-42001', file: 'app/iso-42001/page.tsx', outcome: 'ISO alignment page is reachable.' },
  { route: '/nist-ai-rmf', file: 'app/nist-ai-rmf/page.tsx', outcome: 'NIST AI RMF alignment page is reachable.' },
  { route: '/evidence-pack', file: 'app/evidence-pack/page.tsx', outcome: 'Evidence pack page is reachable.' },
  { route: '/controls', file: 'app/controls/page.tsx', outcome: 'Control template page is reachable.' },
  { route: '/approvals', file: 'app/approvals/page.tsx', outcome: 'Approval queue page is reachable.' },
  { route: '/gateway/monitor', file: 'app/gateway/monitor/page.tsx', outcome: 'Monitor page is reachable.' },
  { route: '/marketplace', file: 'app/marketplace/page.tsx', outcome: 'Marketplace page is reachable.' },
  { route: '/marketplace/production-evidence', file: 'app/marketplace/production-evidence/page.tsx', outcome: 'Production evidence page is reachable.' },
  { route: '/api/gateway/controls/templates', file: 'app/api/gateway/controls/templates/route.ts', outcome: 'Control templates API exists.' },
  { route: '/api/gateway/evidence/bundle', file: 'app/api/gateway/evidence/bundle/route.ts', outcome: 'Evidence bundle API exists.' },
  { route: '/api/gateway/approvals', file: 'app/api/gateway/approvals/route.ts', outcome: 'Approvals API exists.' },
];

const forbiddenLinks = [
  { file: 'app/controls/page.tsx', text: 'href="/docs"', reason: 'Controls page must not link to missing docs route.' },
  { file: 'app/controls/page.tsx', text: 'href="#"', reason: 'Controls page must not use placeholder anchors.' },
  { file: 'app/ai-compliance/page.tsx', text: 'href="#"', reason: 'Compliance page must not use placeholder anchors.' },
];

const requiredText = [
  { file: 'docs/UX_WORKING_RULES.md', text: 'What benefit does the user get?', reason: 'UX working rules must include flow completion benefit question.' },
  { file: 'docs/UX_WORKING_RULES.md', text: 'What evidence proves the flow worked?', reason: 'UX working rules must require evidence proof.' },
  { file: 'docs/UX_WORKING_RULES.md', text: 'Where is the tangible output', reason: 'UX working rules must require tangible output.' },
  { file: 'app/controls/page.tsx', text: 'Action map', reason: 'Controls page must explain action outcomes.' },
  { file: 'app/approvals/page.tsx', text: 'Approve', reason: 'Approval page must expose approve action.' },
  { file: 'app/approvals/page.tsx', text: 'Reject', reason: 'Approval page must expose reject action.' },
];

const flowOutcomes = [
  {
    id: 'controls-to-evidence',
    benefit: 'User can turn a governance control into evidence review.',
    action: 'Open /controls and click Open evidence pack or Open JSON.',
    evidence: 'The evidence pack page or control templates API returns visible evidence/control data.',
    output: '/evidence-pack or /api/gateway/controls/templates',
    files: ['app/controls/page.tsx', 'app/evidence-pack/page.tsx', 'app/api/gateway/controls/templates/route.ts'],
    requiredText: ['Open evidence pack', 'Open JSON'],
  },
  {
    id: 'approval-decision',
    benefit: 'Reviewer can approve or reject a review-required AI action.',
    action: 'Open /approvals?orgId=org-smoke and click Approve or Reject on a pending item.',
    evidence: 'Approval API records approvalHash and redirects with lastDecision.',
    output: '/approvals?orgId=org-smoke&lastDecision=...',
    files: ['app/approvals/page.tsx', 'app/api/gateway/approvals/route.ts'],
    requiredText: ['Approve', 'Reject', 'approvalHash', 'lastDecision'],
  },
  {
    id: 'signed-evidence-bundle',
    benefit: 'User can export portable audit evidence for buyer, auditor, or consultant review.',
    action: 'Open /evidence-pack and click Download signed evidence bundle.',
    evidence: 'Evidence bundle API returns bundleHash, eventHashes, and signature metadata.',
    output: '/api/gateway/evidence/bundle?orgId=org-smoke',
    files: ['app/evidence-pack/page.tsx', 'app/api/gateway/evidence/bundle/route.ts', 'lib/gateway/evidence-bundle.ts'],
    requiredText: ['Download signed evidence bundle', 'bundleHash', 'signature'],
  },
];

const failures = [];
for (const check of routeChecks) if (!fs.existsSync(check.file)) failures.push({ type: 'missing-route-file', ...check });
for (const check of forbiddenLinks) {
  if (!fs.existsSync(check.file)) continue;
  const content = fs.readFileSync(check.file, 'utf8');
  if (content.includes(check.text)) failures.push({ type: 'forbidden-link', ...check });
}
for (const check of requiredText) {
  if (!fs.existsSync(check.file)) { failures.push({ type: 'missing-required-file', ...check }); continue; }
  const content = fs.readFileSync(check.file, 'utf8');
  if (!content.includes(check.text)) failures.push({ type: 'missing-required-text', ...check });
}
for (const flow of flowOutcomes) {
  const combined = flow.files.filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const file of flow.files) if (!fs.existsSync(file)) failures.push({ type: 'flow-missing-file', flow: flow.id, file });
  for (const text of flow.requiredText) if (!combined.includes(text)) failures.push({ type: 'flow-missing-required-text', flow: flow.id, text });
}

const result = {
  ok: failures.length === 0,
  type: 'dsg-ux-route-map-verification',
  checkedAt: new Date().toISOString(),
  routeChecks: routeChecks.length,
  flowOutcomeChecks: flowOutcomes.length,
  failures,
  flowOutcomes,
  userOutcome: failures.length === 0 ? 'All audited DSG flows expose user benefit, real action, evidence, and tangible output.' : 'UX flow verification failed. Fix failures before deploy.'
};

fs.mkdirSync('artifacts/ux-route-map', { recursive: true });
fs.writeFileSync('artifacts/ux-route-map/ux-route-map-result.json', `${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
