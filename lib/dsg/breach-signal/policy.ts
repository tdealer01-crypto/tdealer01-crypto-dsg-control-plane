export type BreachSignalDecision = "BLOCK" | "REVIEW" | "INCIDENT_REPORT_ALLOWED";
export type BreachEvidenceLevel = "L0" | "L1" | "L2" | "L3" | "L4";
export type BreachSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BreachSignalInput = {
  owner?: string;
  sourceCategory?: string;
  legalPurpose?: string;
  rawDataIncluded?: boolean;
  fullDumpIncluded?: boolean;
  requiresLogin?: boolean;
  requiresPayment?: boolean;
  requiresDownload?: boolean;
  autonomousAgentAccess?: boolean;
  networkRoute?: "standard" | "tor" | "unknown";
  claimedDataTypes?: string[];
  maskedSamples?: string[];
  hashes?: string[];
  ownerConfirmed?: boolean;
  providerConfirmed?: boolean;
  internalLogConfirmed?: boolean;
};

export type BreachSignalEvaluation = {
  decision: BreachSignalDecision;
  evidenceLevel: BreachEvidenceLevel;
  severity: BreachSeverity;
  reasons: string[];
  allowedActions: string[];
  blockedActions: string[];
  rawDataStored: false;
};

const CRITICAL_DATA_TYPES = new Set([
  "api_key",
  "private_key",
  "session_token",
  "admin_credential",
  "payment_data",
  "production_secret",
]);

const HIGH_DATA_TYPES = new Set([
  "hashed_password",
  "phone",
  "internal_endpoint",
  "customer_table",
  "customer_record",
]);

const MEDIUM_DATA_TYPES = new Set(["email", "username", "employee_name"]);

function normalizeList(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function hasMaskedEvidence(input: BreachSignalInput): boolean {
  return Boolean((input.maskedSamples?.length ?? 0) > 0 || (input.hashes?.length ?? 0) > 0);
}

function getEvidenceLevel(input: BreachSignalInput): BreachEvidenceLevel {
  if (input.providerConfirmed || input.internalLogConfirmed) return "L4";
  if (input.ownerConfirmed) return "L3";
  if (hasMaskedEvidence(input)) return "L2";
  if (input.owner || input.sourceCategory) return "L1";
  return "L0";
}

function getSeverity(input: BreachSignalInput): BreachSeverity {
  const dataTypes = normalizeList(input.claimedDataTypes);

  if (dataTypes.some((type) => CRITICAL_DATA_TYPES.has(type))) return "CRITICAL";
  if (dataTypes.some((type) => HIGH_DATA_TYPES.has(type))) return "HIGH";
  if (dataTypes.some((type) => MEDIUM_DATA_TYPES.has(type))) return "MEDIUM";
  return "LOW";
}

export function evaluateBreachSignal(input: BreachSignalInput): BreachSignalEvaluation {
  const reasons: string[] = [];
  const blockedActions = [
    "do_not_download_full_dump",
    "do_not_store_raw_stolen_data",
    "do_not_pay_or_login_to_source",
    "do_not_allow_autonomous_dark_web_browsing",
  ];

  const owner = input.owner?.trim();
  const legalPurpose = input.legalPurpose?.trim();

  if (!owner) reasons.push("OWNER_SCOPE_REQUIRED");
  if (!legalPurpose) reasons.push("LEGAL_PURPOSE_REQUIRED");
  if (input.rawDataIncluded) reasons.push("RAW_DATA_INCLUDED");
  if (input.fullDumpIncluded) reasons.push("FULL_DUMP_INCLUDED");
  if (input.requiresLogin) reasons.push("SOURCE_REQUIRES_LOGIN");
  if (input.requiresPayment) reasons.push("SOURCE_REQUIRES_PAYMENT");
  if (input.requiresDownload) reasons.push("SOURCE_REQUIRES_DOWNLOAD");
  if (input.autonomousAgentAccess) reasons.push("AUTONOMOUS_AGENT_ACCESS_BLOCKED");
  if (input.networkRoute === "tor" && input.autonomousAgentAccess) reasons.push("TOR_AUTONOMOUS_ACCESS_BLOCKED");
  if (input.networkRoute === "unknown") reasons.push("UNKNOWN_NETWORK_ROUTE");

  const evidenceLevel = getEvidenceLevel(input);
  const severity = getSeverity(input);

  const hardBlock = reasons.length > 0;

  if (hardBlock) {
    return {
      decision: "BLOCK",
      evidenceLevel,
      severity,
      reasons,
      allowedActions: ["redact_or_discard_raw_material", "capture_minimal_metadata_only", "request_owner_scope"],
      blockedActions,
      rawDataStored: false,
    };
  }

  if (evidenceLevel === "L3" || evidenceLevel === "L4") {
    return {
      decision: "INCIDENT_REPORT_ALLOWED",
      evidenceLevel,
      severity,
      reasons: ["OWNER_OR_PROVIDER_CONFIRMATION_PRESENT", "RAW_DATA_NOT_STORED"],
      allowedActions: ["create_owner_notification_report", "create_remediation_checklist", "record_audit_evidence_manifest"],
      blockedActions,
      rawDataStored: false,
    };
  }

  return {
    decision: "REVIEW",
    evidenceLevel,
    severity,
    reasons: ["OWNER_VERIFICATION_REQUIRED", "RAW_DATA_NOT_STORED"],
    allowedActions: ["request_owner_verification", "create_redacted_preliminary_report", "record_audit_evidence_manifest"],
    blockedActions,
    rawDataStored: false,
  };
}
