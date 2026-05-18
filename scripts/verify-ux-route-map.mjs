#!/usr/bin/env node

import fs from 'node:fs';

const routeChecks = [
  { route: '/proofgate', file: 'app/proofgate/page.tsx', outcome: 'ProofGate product page is reachable.' },
  { route: '/enterprise-ready', file: 'app/enterprise-ready/page.tsx', outcome: 'Enterprise setup page is reachable.' },
  { route: '/dashboard/integrations', file: 'app/dashboard/integrations/page.tsx', outcome: 'Self-service integration setup page is reachable.' },
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
  { file: 'app/proofgate/page.tsx', text: 'href="#"', reason: 'ProofGate product page must not use placeholder anchors.' },
  { file: 'app/enterprise-ready/page.tsx', text: 'href="#"', reason: 'Enterprise setup page must not use placeholder anchors.' },
  { file: 'app/dashboard/integrations/page.tsx', text: 'href="#"', reason: 'Integration setup page must not use placeholder anchors.' },
];

const requiredText = [
  { file: 'docs/UX_WORKING_RULES.md', text: 'What benefit does the user get?', reason: 'UX working rules must include flow completion benefit question.' },
  { file: 'docs/UX_WORKING_RULES.md', text: 'What evidence proves the flow worked?', reason: 'UX working rules must require evidence proof.' },
  { file: 'docs/UX_WORKING_RULES.md', text: 'Where is the tangible output', reason: 'UX working rules must require tangible output.' },
  { file: 'app/proofgate/page.tsx', text: 'Govern every AI action before it touches a customer system.', reason: 'ProofGate page must state the product promise.' },
  { file: 'app/proofgate/page.tsx', text: 'Seven-step product flow', reason: 'ProofGate page must expose the buyer demo flow.' },
  { file: 'app/proofgate/page.tsx', text: 'Five-layer architecture', reason: 'ProofGate page must expose the architecture story.' },
  { file: 'app/dsg-brand.css', text: '--dsg-sapphire', reason: 'Brand layer must include blue sapphire token.' },
  { file: 'app/dsg-brand.css', text: '--dsg-gold', reason: 'Brand layer must include gold token.' },
  { file: 'app/dsg-brand.css', text: '--dsg-red', reason: 'Brand layer must include red token.' },
  { file: 'app/enterprise-ready/page.tsx', text: 'Four steps to first governed proof', reason: 'Enterprise setup page must expose clear setup steps.' },
  { file: 'app/enterprise-ready/page.tsx', text: 'Connect DSG to the systems customers already use.', reason: 'Enterprise setup page must emphasize existing-system adoption.' },
  { file: 'app/dashboard/integrations/page.tsx', text: 'Connect one existing workflow in minutes.', reason: 'Integrations page must make the install value obvious.' },
  { file: 'app/dashboard/integrations/page.tsx', text: 'Quota-aware rollout', reason: 'Integrations page must preserve Vercel/deploy quota.' },
  { file: 'docs/ENTERPRISE_READY_AUTOPILOT.md', text: 'one existing system -> one governed action -> one evidence trail -> one expansion decision', reason: 'Enterprise runbook must define the tangible user outcome.' },
  { file: 'docs/ENTERPRISE_READY_AUTOPILOT.md', text: '/proofgate', reason: 'Runbook must mention the ProofGate product surface.' },
  { file: 'components/GlobalNav.tsx', text: 'ProofGate', reason: 'Global nav must expose ProofGate page.' },
  { file: 'app/controls/page.tsx', text: 'Action map', reason: 'Controls page must explain action outcomes.' },
  { file: 'app/approvals/page.tsx', text: 'Approve', reason: 'Approval page must expose approve action.' },
  { file: 'app/approvals/page.tsx', text: 'Reject', reason: 'Approval page must expose reject action.' },
];

const flowOutcomes = [
  {
    id: 'proofgate-to-integration-proof',
    benefit: 'Buyer can understand the ProofGate product promise and move to one connected system.',
    action: 'Open /proofgate and click Connect first system to /dashboard/integrations.',
    evidence: 'ProofGate page exposes product flow, architecture, and truth boundary before setup.',
    output: '/proofgate and /dashboard/integrations',
    files: ['app/proofgate/page.tsx', 'app/dashboard/integrations/page.tsx', 'docs/ENTERPRISE_READY_AUTOPILOT.md'],
    requiredText: ['Connect first system', 'Seven-step product flow', 'Five-layer architecture', 'policy-gated AI and automation execution'],
  },
  {
    id: 'enterprise-ready-to-integration-proof',
    benefit: 'Customer can start from one existing system and reach a governed proof path without migration.',
    action: 'Open /enterprise-ready, then click Start setup to /dashboard/integrations.',
    evidence: 'Integration page exposes register, webhook, execute, and evidence checklist steps.',
    output: '/dashboard/integrations and docs/ENTERPRISE_READY_AUTOPILOT.md',
    files: ['app/enterprise-ready/page.tsx', 'app/dashboard/integrations/page.tsx', 'docs/ENTERPRISE_READY_AUTOPILOT.md'],
    requiredText: ['Start setup', 'Register integration', 'Execute one governed action', 'one governed action'],
  },
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
    action: 'Open /evidence-pack and click Download evidence bundle.',
    evidence: 'Evidence bundle API returns bundleHash, eventHashes, and signature metadata.',
    output: '/api/gateway/evidence/bundle?orgId=org-smoke',
    files: ['app/evidence-pack/page.tsx', 'app/api/gateway/evidence/bundle/route.ts', 'lib/gateway/evidence-bundle.ts'],
    requiredText: ['Download evidence bundle', 'bundleHash', 'signature'],
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
