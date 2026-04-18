export type PublicProofReport = {
  product_name: string;
  category: string;
  generated_at: string;
  report_version: string;
  one_line_summary: string;
  problem_solved: string[];
  core_capabilities: string[];
  enterprise_value: string[];
  proof_points: {
    approval_control: boolean;
    runtime_summary: boolean;
    ledger_lineage: boolean;
    checkpoint_visibility: boolean;
    rbac_enforced: boolean;
    governance_surface: boolean;
  };
  why_use_this_app: string;
  final_recommendation: string;
  recommended_links: {
    start_page: '/enterprise-proof/start';
    report_page: '/enterprise-proof/report';
    json_report: '/api/enterprise-proof/report';
    verified_runtime_report: '/enterprise-proof/verified';
  };
  evidence_boundary: {
    public_scope: string;
    verified_scope: string;
  };
  evidence_summary: {
    test_snapshot: {
      generated_at: string;
      vitest_files_passed: number;
      vitest_tests_passed: number;
      typecheck_passed: boolean;
    };
    runtime_artifacts: string[];
  };
};

export type VerifiedRuntimeProofReport = {
  report_class: 'verified_runtime';
  evidence_scope: 'org_agent_scoped';
  mode: 'verified_runtime';
  org_id: string;
  agent_id: string;
  generated_at: string;
  runtime_summary: {
    truth_epoch: number | null;
    truth_sequence: number | null;
    latest_truth_hash: string | null;
    latest_entry_hash: string | null;
  };
  approval_anti_replay: {
    replay_protected: boolean;
    terminal_approval_enforced: boolean;
    expired_rejected: boolean;
  };
  truth_ledger_lineage: {
    latest_truth_sequence: number | null;
    latest_ledger_sequence: number | null;
    drift_detected: boolean;
  };
  checkpoint_recovery: {
    pass: boolean;
    latest_checkpoint_sequence: number | null;
    missing_lineage_count: number;
  };
  effects: {
    recent_count: number;
    callback_reconciled: boolean;
  };
  governance: {
    runtime_roles: string[];
    policy_count: number;
    rbac_enforced: boolean;
  };
  billing_operational_value: {
    executions_this_period: number;
    usage_events: number;
    billed_estimate_usd: number;
  };
  source: {
    public_narrative_available: true;
    verified_runtime_available: true;
    generated_from: 'runtime_tables';
  };
  gaps: string[];
};

export type VerifiedRuntimeProofSummary = {
  report_class: 'verified_runtime_summary';
  mode: 'verified_runtime';
  org_id: string;
  agent_id: string;
  generated_at: string;
  final_verdict: 'verified' | 'partial' | 'insufficient_evidence';
  drift_detected: boolean;
  replay_protected: boolean;
  checkpoint_pass: boolean;
  rbac_enforced: boolean;
  gaps: string[];
};
