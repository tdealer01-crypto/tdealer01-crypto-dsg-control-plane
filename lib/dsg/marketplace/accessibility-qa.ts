export type AccessibilityQaStatus = 'PASS' | 'REVIEW' | 'BLOCKED';

export type AccessibilityQaCheck = {
  id: string;
  title: string;
  status: AccessibilityQaStatus;
  userBenefit: string;
  evidence: string[];
  requiredBeforePass: string[];
  nextAction: string;
};

export type AccessibilityQaReport = {
  ok: true;
  kit: 'enterprise-accessibility-qa-kit';
  generatedAt: string;
  verdict: AccessibilityQaStatus;
  scope: string[];
  checks: AccessibilityQaCheck[];
  noMockPolicy: { enforced: true; rule: string };
};

const checks: AccessibilityQaCheck[] = [
  {
    id: 'keyboard-navigation',
    title: 'Keyboard navigation',
    status: 'BLOCKED',
    userBenefit: 'Core flows must be usable without a mouse.',
    evidence: [],
    requiredBeforePass: ['Keyboard traversal notes', 'Focus order notes', 'Primary action review'],
    nextAction: 'Attach keyboard review notes before PASS.',
  },
  {
    id: 'semantic-structure',
    title: 'Semantic structure',
    status: 'BLOCKED',
    userBenefit: 'Core pages must expose clear headings, labels, landmarks, and state text.',
    evidence: [],
    requiredBeforePass: ['Heading order review', 'Form label review', 'Landmark review', 'State wording review'],
    nextAction: 'Attach semantic structure review notes before PASS.',
  },
  {
    id: 'visual-clarity',
    title: 'Visual clarity',
    status: 'BLOCKED',
    userBenefit: 'Users must be able to read verdicts, states, and next actions clearly.',
    evidence: [],
    requiredBeforePass: ['Contrast review', 'Focus-visible review', 'Mobile viewport review'],
    nextAction: 'Attach visual review evidence before PASS.',
  },
  {
    id: 'qa-smoke',
    title: 'QA smoke',
    status: 'REVIEW',
    userBenefit: 'Reviewers need a real endpoint, page, and smoke script before submission.',
    evidence: ['Endpoint: /api/dsg/marketplace/accessibility-qa', 'Page: /enterprise/accessibility', 'Script: smoke:accessibility-qa'],
    requiredBeforePass: ['Run smoke:accessibility-qa', 'Run smoke:marketplace-readiness', 'Run smoke:app-builder-flow-proof'],
    nextAction: 'Run smoke scripts against preview or production and attach output before PASS.',
  },
];

function deriveVerdict(items: AccessibilityQaCheck[]): AccessibilityQaStatus {
  if (items.some((item) => item.status === 'BLOCKED')) return 'BLOCKED';
  if (items.some((item) => item.status === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function getAccessibilityQaReport(): AccessibilityQaReport {
  return {
    ok: true,
    kit: 'enterprise-accessibility-qa-kit',
    generatedAt: new Date().toISOString(),
    verdict: deriveVerdict(checks),
    scope: ['/dsg/app-builder', '/enterprise/readiness', '/enterprise/terms', '/enterprise/privacy', '/enterprise/security', '/enterprise/support'],
    checks,
    noMockPolicy: {
      enforced: true,
      rule: 'Do not mark checks PASS until real review notes, smoke output, or deployment evidence are attached.',
    },
  };
}
