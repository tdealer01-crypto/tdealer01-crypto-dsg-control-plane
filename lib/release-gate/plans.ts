export type ReleaseGatePlanId = 'free' | 'pro' | 'enterprise';

export type ReleaseGatePlan = {
  id: ReleaseGatePlanId;
  name: string;
  price: string;
  description: string;
  features: string[];
  limitLabel: string;
};

export const releaseGatePlans: ReleaseGatePlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Quick launch readiness check for one-off URLs.',
    limitLabel: 'Manual checks only',
    features: ['Trust pages', 'Health endpoint', 'Readiness endpoint', 'GO / NO-GO verdict'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mo',
    description: 'Saved reports and repeat checks for active products.',
    limitLabel: 'Saved reports + scheduled checks',
    features: ['Everything in Free', 'Report history', 'Shareable evidence links', 'Daily scheduled checks'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'User-flow and audit evidence gates for production launches.',
    limitLabel: 'Custom user-flow and audit gates',
    features: ['Everything in Pro', 'User-flow verification', 'Audit evidence validation', 'Launch readiness support'],
  },
];
