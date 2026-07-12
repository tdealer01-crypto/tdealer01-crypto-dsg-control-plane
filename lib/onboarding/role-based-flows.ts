import type { OnboardingRole } from '../../components/RoleSelector';

export interface OnboardingStep {
  num: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  color: string;
  ctaColor: string;
  roleContext?: string;
}

const ALL_STEPS: Record<string, OnboardingStep> = {
  api_key: {
    num: '01',
    title: 'Create your API key',
    description:
      'Generate a scoped API key for your first integration. The raw key is shown once — save it securely.',
    href: '/dashboard/api-keys',
    cta: 'Go to API Keys →',
    color: 'border-amber-300/30 bg-amber-300/5',
    ctaColor: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
    roleContext: 'Used for authenticating your requests to DSG ONE',
  },
  quickstart: {
    num: '02',
    title: 'Follow the Quickstart',
    description:
      'Three REST API calls — declare your session, gate every action, handle ALLOW/BLOCK. No SDK needed.',
    href: '/quickstart',
    cta: 'Open Quickstart →',
    color: 'border-emerald-400/30 bg-emerald-400/5',
    ctaColor: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    roleContext: 'Build your first integration in 5 minutes',
  },
  dashboard: {
    num: '03',
    title: 'Watch it work',
    description:
      'Go to your dashboard to see gated actions, audit stamps, and real-time session state.',
    href: '/dashboard',
    cta: 'Open Dashboard →',
    color: 'border-blue-400/30 bg-blue-400/5',
    ctaColor: 'bg-blue-400 text-slate-950 hover:bg-blue-300',
    roleContext: 'Monitor your live integrations',
  },
  webhooks: {
    num: '02',
    title: 'Setup webhooks',
    description:
      'Configure event-driven integrations to receive real-time updates from your applications.',
    href: '/dashboard/webhooks',
    cta: 'Go to Webhooks →',
    color: 'border-purple-400/30 bg-purple-400/5',
    ctaColor: 'bg-purple-400 text-slate-950 hover:bg-purple-300',
    roleContext: 'Connect your systems in real-time',
  },
  policies: {
    num: '02',
    title: 'Create approval policies',
    description:
      'Define governance rules in plain language. DSG ONE enforces them automatically before execution.',
    href: '/dashboard/policies',
    cta: 'Go to Policies →',
    color: 'border-emerald-400/30 bg-emerald-400/5',
    ctaColor: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    roleContext: 'Set spending limits, approval workflows, and compliance rules',
  },
  audit: {
    num: '03',
    title: 'View audit trail',
    description:
      'Every decision is recorded with a tamper-proof SHA-256 hash chain for full compliance.',
    href: '/dashboard/audit',
    cta: 'Go to Audit →',
    color: 'border-blue-400/30 bg-blue-400/5',
    ctaColor: 'bg-blue-400 text-slate-950 hover:bg-blue-300',
    roleContext: 'Verify compliance and replay decisions',
  },
};

export const ROLE_FLOWS: Record<OnboardingRole, string[]> = {
  developer: ['api_key', 'webhooks', 'quickstart', 'dashboard'],
  finance_operator: ['api_key', 'policies', 'audit', 'dashboard'],
  executive: ['api_key', 'policies', 'audit', 'dashboard'],
};

export function getStepsForRole(role: OnboardingRole): OnboardingStep[] {
  const stepKeys = ROLE_FLOWS[role];
  return stepKeys
    .map((key, idx) => {
      const step = ALL_STEPS[key];
      return {
        ...step,
        num: String(idx + 1).padStart(2, '0'),
      };
    })
    .slice(0, 3);
}

export function getDefaultSteps(): OnboardingStep[] {
  return [ALL_STEPS.api_key, ALL_STEPS.quickstart, ALL_STEPS.dashboard].map(
    (step, idx) => ({
      ...step,
      num: String(idx + 1).padStart(2, '0'),
    })
  );
}
