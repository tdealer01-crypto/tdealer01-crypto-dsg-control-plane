import {
  type FinanceGovernanceApprovalItem,
  getApprovalItems,
  getWorkspaceSummary,
} from './mock-data';
import {
  buildApprovalActionResult,
  buildSubmitResult,
  type FinanceGovernanceActionResult,
} from './actions';

type ServerWorkflowState = {
  workspaceName: string;
  approvals: FinanceGovernanceApprovalItem[];
  submittedCount: number;
  lastAction: FinanceGovernanceActionResult | null;
};

type ServerWorkflowSnapshot = {
  workspace: {
    workspace: string;
    counts: {
      pendingApprovals: number;
      openExceptions: number;
      readyExports: number;
    };
  };
  approvals: FinanceGovernanceApprovalItem[];
  lastAction: FinanceGovernanceActionResult | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __financeGovernanceServerWorkflowState: ServerWorkflowState | undefined;
}

function createDefaultState(): ServerWorkflowState {
  const summary = getWorkspaceSummary();

  return {
    workspaceName: summary.workspace,
    approvals: getApprovalItems(),
    submittedCount: 0,
    lastAction: null,
  };
}

function getStore(): ServerWorkflowState {
  if (!globalThis.__financeGovernanceServerWorkflowState) {
    globalThis.__financeGovernanceServerWorkflowState = createDefaultState();
  }

  return globalThis.__financeGovernanceServerWorkflowState;
}

function computeCounts(approvals: FinanceGovernanceApprovalItem[], submittedCount: number) {
  return {
    pendingApprovals: approvals.filter((item) => !['approved', 'rejected'].includes(item.status.toLowerCase())).length,
    openExceptions: approvals.filter((item) => item.status.toLowerCase().includes('exception')).length,
    readyExports: submittedCount,
  };
}

export function getServerWorkflowSnapshot(): ServerWorkflowSnapshot {
  const store = getStore();

  return {
    workspace: {
      workspace: store.workspaceName,
      counts: computeCounts(store.approvals, store.submittedCount),
    },
    approvals: store.approvals,
    lastAction: store.lastAction,
  };
}

export function resetServerWorkflowState(): ServerWorkflowSnapshot {
  globalThis.__financeGovernanceServerWorkflowState = createDefaultState();
  return getServerWorkflowSnapshot();
}

export function submitServerWorkflowItem(caseId: string): FinanceGovernanceActionResult {
  const store = getStore();
  const result = buildSubmitResult(caseId);

  store.submittedCount += 1;
  store.lastAction = result;

  return result;
}

export function applyApprovalAction(
  approvalId: string,
  action: 'approve' | 'reject' | 'escalate'
): FinanceGovernanceActionResult {
  const store = getStore();
  const result = buildApprovalActionResult(action, approvalId);

  store.approvals = store.approvals.map((item) =>
    item.id === approvalId
      ? {
          ...item,
          status: result.nextStatus,
        }
      : item
  );
  store.lastAction = result;

  return result;
}
