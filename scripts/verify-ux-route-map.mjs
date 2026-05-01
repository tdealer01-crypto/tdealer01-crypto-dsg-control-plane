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
];

const requiredText = [
  { file: 'docs/UX_WORKING_RULES.md', text: 'Every button/link points to an existing route', reason: 'UX working rules must enforce no dead links.' },
  { file: 'docs/UX_WORKING_RULES.md', text: 'Every PR must include a user outcome statement', reason: 'PRs must include user outcome.' },
  { file: 'app/controls/page.tsx', text: 'Action map', reason: 'Controls page must explain action outcomes.' },
  { file: 'app/approvals/page.tsx', text: 'Approve', reason: 'Approval page must expose approve action.' },
  { file: 'app/approvals/page.tsx', text: 'Reject', reason: 'Approval page must expose reject action.' },
];

const failures = [];

for (const check of routeChecks) {
  if (!fs.existsSync(check.file)) {
    failures.push({ type: 'missing-route-file', ...check });
  }
}

for (const check of forbiddenLinks) {
  if (fs.existsSync(check.file)) {
    const content = fs.readFileSync(check.file, 'utf8');
    if (content.includes(check.text)) {
      failures.push({ type: 'forbidden-link', ...check });
    }
  }
}

for (const check of requiredText) {
  if (!fs.existsSync(check.file)) {
    failures.push({ type: 'missing-required-file', ...check });
    continue;
  }
  const content = fs.readFileSync(check.file, 'utf8');
  if (!content.includes(check.text)) {
    failures.push({ type: 'missing-required-text', ...check });
  }
}

const result = {
  ok: failures.length === 0,
  type: 'dsg-ux-route-map-verification',
  checkedAt: new Date().toISOString(),
  routeChecks: routeChecks.length,
  requiredTextChecks: requiredText.length,
  forbiddenLinkChecks: forbiddenLinks.length,
  failures,
  userOutcome: failures.length === 0
    ? 'Core compliance, evidence, control, approval, monitor, marketplace, and API routes exist with no known dead /docs link from controls.'
    : 'UX route map verification failed. Fix failures before deploy.',
};

fs.mkdirSync('artifacts/ux-route-map', { recursive: true });
fs.writeFileSync('artifacts/ux-route-map/ux-route-map-result.json', `${JSON.stringify(result, null, 2)}\n`);

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
