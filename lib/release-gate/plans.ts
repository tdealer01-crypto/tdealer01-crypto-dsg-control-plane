export type ReleaseGatePlan = {
  id: 'free' | 'starter' | 'pro';
  name: string;
  price: string;
  description: string;
  features: string[];
};

export const releaseGatePlans: ReleaseGatePlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Basic launch readiness check for a single public URL.',
    features: [
      'Health and readiness URL guidance',
      'Trust page checklist',
      'Basic go/no-go summary',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$99',
    description: 'Guided launch check for small teams preparing a pilot.',
    features: [
      'Health/readiness verification',
      'Trust surface review',
      'Customer-view checklist',
      'Exportable launch notes',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$299',
    description: 'Release gate workflow for production launches and client demos.',
    features: [
      'Full go/no-go checklist',
      'Audit evidence review',
      'Demo readiness review',
      'Priority launch recommendations',
    ],
  },
];
