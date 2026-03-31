import type { PublicProofReport } from './proof-types';

export function buildPublicProofReport(): PublicProofReport {
  return {
    product_name: 'DSG ONE',
    category: 'Deterministic AI runtime control plane',
    one_line_summary:
      'A runtime control plane for enterprises that need AI execution to be auditable, replay-resistant, recoverable, and governed.',
    problem_solved: [
      'duplicate or replayed execution risk',
      'lack of runtime lineage',
      'weak operational recovery visibility',
      'policy without enforceable runtime control',
    ],
    core_capabilities: [
      'runtime intent approval',
      'deterministic decision path',
      'ledger-backed execution lineage',
      'checkpoint visibility',
      'effect callback reconciliation',
      'role-based governance',
    ],
    enterprise_value: [
      'auditability',
      'runtime trust',
      'reduced operational risk',
      'faster incident investigation',
      'governed AI operations',
    ],
    proof_points: {
      approval_control: true,
      runtime_summary: true,
      ledger_lineage: true,
      checkpoint_visibility: true,
      rbac_enforced: true,
      governance_surface: true,
    },
    why_use_this_app:
      'Enterprises should use this app when AI actions must be controlled, reviewable, and operationally trustworthy in production.',
    final_recommendation:
      'Use DSG ONE when AI execution must be governed, inspectable, and supported by runtime evidence rather than policy documents alone.',
    recommended_links: {
      start_page: '/enterprise-proof/start',
      report_page: '/enterprise-proof/report',
      json_report: '/api/enterprise-proof/report',
    },
  };
}
