export type FinanceGovernanceWorkspaceSummary = {
  workspace: string;
  counts: {
    pendingApprovals: number;
    openExceptions: number;
    readyExports: number;
  };
  quickLinks: Array<{
    href: string;
    label: string;
  }>;
};

export type FinanceGovernanceOnboardingStep = {
  id: string;
  label: string;
  status: 'todo' | 'in_progress' | 'done';
};

export type FinanceGovernanceApprovalItem = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

export type FinanceGovernanceCaseDetail = {
  id: string;
  status: string;
  exportStatus: string;
  transaction: {
    vendor: string;
    amount: string;
    currency: string;
    workflow: string;
  };
  timeline: string[];
};

export function getWorkspaceSummary(): FinanceGovernanceWorkspaceSummary {
  return {
    workspace: 'Finance Governance Workspace',
    counts: {
      pendingApprovals: 12,
      openExceptions: 3,
      readyExports: 5,
    },
    quickLinks: [
      { href: '/finance-governance/app/onboarding', label: 'Onboarding template' },
      { href: '/finance-governance/app/approvals', label: 'Approval queue' },
      { href: '/finance-governance/app/cases/sample-case', label: 'Sample case detail' },
    ],
  };
}

export function getOnboardingSteps(): FinanceGovernanceOnboardingStep[] {
  return [
    { id: 'workspace', label: 'Create or confirm the workspace', status: 'done' },
    { id: 'roles', label: 'Invite finance, approver, audit, and admin roles', status: 'in_progress' },
    { id: 'template', label: 'Select invoice or payment approval template', status: 'todo' },
    { id: 'policy', label: 'Publish the first policy version', status: 'todo' },
    { id: 'sample', label: 'Submit the first governed item', status: 'todo' },
  ];
}

export function getApprovalItems(): FinanceGovernanceApprovalItem[] {
  return [
    {
      id: 'APR-1001',
      vendor: 'Northwind Supply',
      amount: 'US$14,250',
      status: 'Needs approver',
      risk: 'Threshold exceeded',
    },
    {
      id: 'APR-1002',
      vendor: 'Contoso Services',
      amount: 'US$2,480',
      status: 'Exception open',
      risk: 'Missing document',
    },
    {
      id: 'APR-1003',
      vendor: 'Blue Ocean Partners',
      amount: 'US$31,900',
      status: 'Compliance review',
      risk: 'High-risk vendor',
    },
  ];
}

export function getCaseDetail(id: string): FinanceGovernanceCaseDetail {
  return {
    id,
    status: 'Compliance review',
    exportStatus: 'Ready',
    transaction: {
      vendor: 'Northwind Supply',
      amount: '14,250',
      currency: 'USD',
      workflow: 'Invoice approval governance',
    },
    timeline: [
      'Submission created by finance maker',
      'Policy route resolved for threshold-based approval',
      'Exception opened for missing supporting document',
      'Compliance review requested',
      'Evidence bundle marked ready for export',
    ],
  };
}
