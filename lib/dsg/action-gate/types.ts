export type DsgActionGateDecision = "RUN" | "REQUEST_APPROVAL" | "BLOCK";

export type DsgActionRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DsgActionKind =
  | "status"
  | "list"
  | "inspect"
  | "web_search"
  | "web_extract"
  | "browser_navigate"
  | "browser_snapshot"
  | "browser_click"
  | "browser_type"
  | "read_file"
  | "write_file"
  | "patch"
  | "terminal"
  | "process"
  | "execute_code"
  | "cronjob"
  | "send_message"
  | "delegate_task"
  | "deploy"
  | "claim"
  | "unknown";

export interface DsgActionGateInput {
  action: DsgActionKind | string;
  readOnly?: boolean;
  workspaceScoped?: boolean;
  pathInsideWorkspace?: boolean;
  sandboxed?: boolean;
  evidenceCaptureEnabled?: boolean;

  // External/network risk
  externalNetwork?: boolean;
  disallowedTarget?: boolean;
  exfiltrationRisk?: boolean;

  // Sensitive user or business surfaces
  touchesSecret?: boolean;
  touchesAuth?: boolean;
  touchesRbac?: boolean;
  touchesBilling?: boolean;
  touchesFinance?: boolean;
  touchesPersonalData?: boolean;

  // Browser-sensitive behaviors
  loginAction?: boolean;
  paymentAction?: boolean;
  adminAction?: boolean;
  destructiveAction?: boolean;

  // Approval/proof facts
  humanApproval?: boolean;
  securityApproval?: boolean;
  deploymentApproval?: boolean;
  deploymentProofPresent?: boolean;
  evidenceManifestPresent?: boolean;
  auditEnabled?: boolean;
}

export interface DsgActionGateResult {
  decision: DsgActionGateDecision;
  risk: DsgActionRisk;
  reasons: string[];
  requiredApprovals: Array<"human" | "security" | "deployment">;
  evidenceRequired: string[];
  input: DsgActionGateInput;
}
