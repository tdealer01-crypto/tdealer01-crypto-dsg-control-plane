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
