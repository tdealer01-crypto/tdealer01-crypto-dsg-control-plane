import { createHash } from "crypto";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DataClass = "public" | "internal" | "confidential" | "restricted" | "payment" | "pii";
export type AutomationMode = "shadow" | "gated" | "autopilot";
export type GateDecision = "PASS" | "REVIEW" | "BLOCK";
export type IntegrationType = "api" | "webhook" | "database" | "file" | "manual";

export interface CustomerOperation {
  name: string;
  method?: string;
  path?: string;
  mutation?: boolean;
  destructive?: boolean;
  payment?: boolean;
  pii?: boolean;
  admin?: boolean;
  requiresHumanApproval?: boolean;
  expectedVolumePerDay?: number;
}

export interface CustomerSystem {
  systemId: string;
  name: string;
  category:
    | "erp"
    | "crm"
    | "finance"
    | "payments"
    | "hris"
    | "support"
    | "data-warehouse"
    | "custom";
  integrationType: IntegrationType;
  environment: "sandbox" | "staging" | "production";
  operations: CustomerOperation[];
  dataClasses: DataClass[];
  businessCriticality?: RiskLevel;
  ownerTeam?: string;
  hasAuditLog?: boolean;
  hasApprovalFlow?: boolean;
  hasRollbackPath?: boolean;
}

export interface MidMarketAutopilotRequest {
  workspaceId?: string;
  customerName?: string;
  industry?: string;
  companySize?: "small" | "mid-market" | "enterprise";
  automationPreference: AutomationMode;
  targetOutcomes?: string[];
  currentPainPoints?: string[];
  systems: CustomerSystem[];
}

export interface OperationRiskResult {
  systemId: string;
  systemName: string;
  operationName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
}

export interface InvariantResult {
  name: string;
  status: GateDecision;
  reason: string;
  evidenceRequired: string[];
}

export interface ControlMapping {
  framework: "ISO_42001" | "NIST_AI_RMF" | "INTERNAL";
  controlId: string;
  controlTitle: string;
  automatedCheck: string;
  evidence: string[];
}

export interface RolloutWave {
  wave: number;
  name: string;
  goal: string;
  durationDays: number;
  exitCriteria: string[];
  systems: string[];
}

export interface RuntimeMonitorCard {
  title: string;
  metric: string;
  threshold: string;
  action: "observe" | "review" | "block";
}

export interface MidMarketAutopilotResult {
  gateVersion: string;
  decision: GateDecision;
  overallRisk: RiskLevel;
  riskScore: number;
  automationMode: AutomationMode;
  readyForCustomerPilot: boolean;
  recommendedPackage: "starter" | "growth" | "regulated";
  valueScore: number;
  estimatedTimeToFirstValueDays: number;
  estimatedGovernedActionsPerMonth: number;
  reasons: string[];
  invariantResults: InvariantResult[];
  operationRisks: OperationRiskResult[];
  controlMappings: ControlMapping[];
  rolloutPlan: RolloutWave[];
  runtimeMonitor: RuntimeMonitorCard[];
  connectionGuide: string[];
  evidenceRequired: string[];
  requestHash: string;
  decisionHash: string;
  generatedAt: string;
}

export const MIDMARKET_AUTOPILOT_GATE_VERSION = "midmarket-governance-autopilot-v1.0";

const RISK_WEIGHT: Record<RiskLevel, number> = {
  low: 15,
  medium: 40,
  high: 70,
  critical: 95,
};

const DATA_CLASS_WEIGHT: Record<DataClass, number> = {
  public: 0,
  internal: 5,
  confidential: 15,
  restricted: 25,
  pii: 25,
  payment: 35,
};

const DEFAULT_TARGET_OUTCOMES = [
  "connect existing customer systems without replacing them",
  "monitor runtime actions before they become audit issues",
  "turn governance policy into deterministic gates",
  "show value within the first operating week",
];

export const MIDMARKET_AUTOPILOT_EXAMPLE: MidMarketAutopilotRequest = {
  workspaceId: "demo-midmarket-workspace",
  customerName: "MidMarket Finance Ops",
  industry: "financial operations",
  companySize: "mid-market",
  automationPreference: "gated",
  targetOutcomes: DEFAULT_TARGET_OUTCOMES,
  currentPainPoints: [
    "manual approval screenshots",
    "slow audit evidence collection",
    "AI/workflow tools can call APIs without one runtime control view",
  ],
  systems: [
    {
      systemId: "crm-hubspot",
      name: "Customer CRM",
      category: "crm",
      integrationType: "api",
      environment: "production",
      dataClasses: ["internal", "pii"],
      businessCriticality: "medium",
      ownerTeam: "Revenue Ops",
      hasAuditLog: true,
      hasApprovalFlow: false,
      hasRollbackPath: true,
      operations: [
        { name: "read customer profile", method: "GET", path: "/contacts/{id}", pii: true, expectedVolumePerDay: 250 },
        { name: "update lifecycle stage", method: "PATCH", path: "/contacts/{id}", mutation: true, pii: true, expectedVolumePerDay: 80 },
      ],
    },
    {
      systemId: "stripe-billing",
      name: "Billing and Payment Gateway",
      category: "payments",
      integrationType: "api",
      environment: "production",
      dataClasses: ["restricted", "payment"],
      businessCriticality: "critical",
      ownerTeam: "Finance",
      hasAuditLog: true,
      hasApprovalFlow: true,
      hasRollbackPath: true,
      operations: [
        { name: "create invoice", method: "POST", path: "/invoices", mutation: true, payment: true, expectedVolumePerDay: 40 },
        { name: "issue refund", method: "POST", path: "/refunds", mutation: true, payment: true, requiresHumanApproval: true, expectedVolumePerDay: 4 },
      ],
    },
  ],
};

export function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function evaluateMidMarketGovernanceAutopilot(
  input: MidMarketAutopilotRequest,
  now: Date = new Date(),
): MidMarketAutopilotResult {
  const request = normalizeRequest(input);
  const operationRisks = request.systems.flatMap((system) =>
    system.operations.map((operation) => classifyOperationRisk(system, operation)),
  );
  const riskScore = Math.max(0, ...operationRisks.map((risk) => risk.riskScore));
  const overallRisk = riskLevelFromScore(riskScore);
  const invariantResults = evaluateInvariants(request, operationRisks);
  const hardBlock = invariantResults.some((item) => item.status === "BLOCK");
  const review = invariantResults.some((item) => item.status === "REVIEW") || overallRisk === "high" || overallRisk === "critical";
  const decision: GateDecision = hardBlock ? "BLOCK" : review ? "REVIEW" : "PASS";
  const reasons = buildReasons(request, decision, overallRisk, invariantResults);
  const evidenceRequired = uniqueSorted(
    invariantResults.flatMap((item) => item.evidenceRequired).concat([
      "integration_inventory",
      "risk_assessment",
      "policy_snapshot",
      "runtime_monitor_snapshot",
      "audit_export",
      "decision_hash",
    ]),
  );
  const rolloutPlan = buildRolloutPlan(request, overallRisk);
  const estimatedGovernedActionsPerMonth = estimateMonthlyActions(request);
  const valueScore = estimateValueScore(request, invariantResults, estimatedGovernedActionsPerMonth);
  const generatedAt = now.toISOString();
  const unsigned = {
    gateVersion: MIDMARKET_AUTOPILOT_GATE_VERSION,
    decision,
    overallRisk,
    riskScore,
    automationMode: request.automationPreference,
    requestHash: sha256(request),
    generatedAt,
  };

  return {
    ...unsigned,
    readyForCustomerPilot: decision !== "BLOCK",
    recommendedPackage: recommendPackage(request, overallRisk),
    valueScore,
    estimatedTimeToFirstValueDays: estimateTimeToFirstValueDays(request, overallRisk),
    estimatedGovernedActionsPerMonth,
    reasons,
    invariantResults,
    operationRisks,
    controlMappings: buildControlMappings(),
    rolloutPlan,
    runtimeMonitor: buildRuntimeMonitor(overallRisk),
    connectionGuide: buildConnectionGuide(request),
    evidenceRequired,
    decisionHash: sha256(unsigned),
  };
}

function normalizeRequest(input: MidMarketAutopilotRequest): MidMarketAutopilotRequest {
  return {
    workspaceId: input.workspaceId || "unassigned-workspace",
    customerName: input.customerName || "unnamed customer",
    industry: input.industry || "unspecified",
    companySize: input.companySize || "mid-market",
    automationPreference: input.automationPreference || "gated",
    targetOutcomes: input.targetOutcomes?.length ? input.targetOutcomes : DEFAULT_TARGET_OUTCOMES,
    currentPainPoints: input.currentPainPoints || [],
    systems: (input.systems || []).map((system) => ({
      ...system,
      businessCriticality: system.businessCriticality || "medium",
      dataClasses: system.dataClasses || ["internal"],
      operations: system.operations || [],
    })),
  };
}

function classifyOperationRisk(system: CustomerSystem, operation: CustomerOperation): OperationRiskResult {
  const method = (operation.method || "GET").toUpperCase();
  const mutation = operation.mutation ?? !["GET", "HEAD", "OPTIONS"].includes(method);
  const reasons: string[] = [];
  let score = RISK_WEIGHT[system.businessCriticality || "medium"];

  const dataScore = Math.max(0, ...system.dataClasses.map((dataClass) => DATA_CLASS_WEIGHT[dataClass] || 0));
  score += dataScore;

  if (system.environment === "production") {
    score += 10;
    reasons.push("production_system");
  }
  if (mutation) {
    score += 14;
    reasons.push("mutation_operation");
  }
  if (operation.destructive || method === "DELETE") {
    score += 25;
    reasons.push("destructive_operation");
  }
  if (operation.payment || system.dataClasses.includes("payment") || system.category === "payments") {
    score += 22;
    reasons.push("payment_or_billing_scope");
  }
  if (operation.pii || system.dataClasses.includes("pii")) {
    score += 14;
    reasons.push("pii_scope");
  }
  if (operation.admin) {
    score += 20;
    reasons.push("admin_scope");
  }
  if (operation.requiresHumanApproval) {
    score += 8;
    reasons.push("declared_human_approval_required");
  }
  if (system.integrationType === "database" && mutation) {
    score += 30;
    reasons.push("direct_database_mutation");
  }
  if (!system.hasAuditLog) {
    score += 8;
    reasons.push("source_audit_log_missing");
  }

  score = Math.min(100, score);

  return {
    systemId: system.systemId,
    systemName: system.name,
    operationName: operation.name,
    riskLevel: riskLevelFromScore(score),
    riskScore: score,
    reasons: reasons.length ? uniqueSorted(reasons) : ["low_risk_read_or_observe_action"],
  };
}

function evaluateInvariants(request: MidMarketAutopilotRequest, operationRisks: OperationRiskResult[]): InvariantResult[] {
  const systems = request.systems;
  const highRisk = operationRisks.some((item) => item.riskLevel === "high" || item.riskLevel === "critical");
  const criticalRisk = operationRisks.some((item) => item.riskLevel === "critical");
  const databaseMutation = systems.some((system) =>
    system.integrationType === "database" && system.operations.some((operation) => operation.mutation || !["GET", "HEAD", "OPTIONS"].includes((operation.method || "GET").toUpperCase())),
  );

  return [
    {
      name: "integration_inventory_present",
      status: systems.length > 0 ? "PASS" : "BLOCK",
      reason: systems.length > 0 ? "customer systems are declared" : "no customer system inventory was provided",
      evidenceRequired: ["integration_inventory"],
    },
    {
      name: "system_owner_defined",
      status: systems.every((system) => Boolean(system.ownerTeam)) ? "PASS" : "REVIEW",
      reason: systems.every((system) => Boolean(system.ownerTeam))
        ? "every system has an accountable owner team"
        : "one or more systems are missing ownerTeam",
      evidenceRequired: ["owner_attestation"],
    },
    {
      name: "no_direct_database_mutation",
      status: databaseMutation ? "BLOCK" : "PASS",
      reason: databaseMutation
        ? "direct database mutation must be replaced by API/webhook connector or approved controlled executor"
        : "no direct database write path detected",
      evidenceRequired: ["connector_boundary", "write_path_review"],
    },
    {
      name: "approval_for_high_risk",
      status: highRisk && !systems.every((system) => system.hasApprovalFlow || system.businessCriticality === "low") ? "REVIEW" : "PASS",
      reason: highRisk
        ? "high or critical actions require approval workflow before execution"
        : "no high-risk approval path required for current inventory",
      evidenceRequired: ["approval_policy", "approver_matrix"],
    },
    {
      name: "audit_coverage",
      status: systems.every((system) => system.hasAuditLog) ? "PASS" : "REVIEW",
      reason: systems.every((system) => system.hasAuditLog)
        ? "source systems expose audit logs or equivalent evidence"
        : "one or more systems need DSG-side evidence capture because source audit is missing",
      evidenceRequired: ["audit_source_map", "dsg_evidence_manifest"],
    },
    {
      name: "rollback_path_for_mutations",
      status: systems.every((system) => system.hasRollbackPath || !system.operations.some((operation) => operation.mutation)) ? "PASS" : "REVIEW",
      reason: "mutation paths should define rollback, compensating action, or manual recovery owner",
      evidenceRequired: ["rollback_runbook"],
    },
    {
      name: "autopilot_boundary",
      status: request.automationPreference === "autopilot" && criticalRisk ? "REVIEW" : "PASS",
      reason:
        request.automationPreference === "autopilot" && criticalRisk
          ? "critical actions cannot start in full autopilot; use shadow or gated mode first"
          : "automation mode is compatible with the declared risk level",
      evidenceRequired: ["automation_mode_policy", "runtime_monitor_snapshot"],
    },
  ];
}

function buildReasons(
  request: MidMarketAutopilotRequest,
  decision: GateDecision,
  overallRisk: RiskLevel,
  invariants: InvariantResult[],
): string[] {
  const reasons = [
    `decision_${decision.toLowerCase()}`,
    `overall_risk_${overallRisk}`,
    `automation_mode_${request.automationPreference}`,
  ];
  for (const invariant of invariants) {
    if (invariant.status !== "PASS") {
      reasons.push(`${invariant.status.toLowerCase()}:${invariant.name}`);
    }
  }
  return uniqueSorted(reasons);
}

function buildControlMappings(): ControlMapping[] {
  return [
    {
      framework: "ISO_42001",
      controlId: "ISO-42001-AIMS-OPS-CONTROL",
      controlTitle: "Operational controls are implemented for AI-enabled workflows",
      automatedCheck: "policy, approval, and runtime monitor gates are evaluated before customer-system action",
      evidence: ["policy_snapshot", "gate_decision", "runtime_monitor_snapshot"],
    },
    {
      framework: "NIST_AI_RMF",
      controlId: "GOVERN-1.5 / MANAGE-2.3",
      controlTitle: "AI risks are governed with accountable roles and monitored controls",
      automatedCheck: "ownerTeam, approver matrix, and risk level are checked per connected system",
      evidence: ["owner_attestation", "risk_assessment", "approver_matrix"],
    },
    {
      framework: "INTERNAL",
      controlId: "DSG-RUNTIME-INVARIANT-MONITOR",
      controlTitle: "Runtime invariants are monitored for every governed connector action",
      automatedCheck: "no direct model-to-API execution, audit capture, approval requirement, rollback readiness",
      evidence: ["invariant_results", "audit_export", "replay_hash"],
    },
  ];
}

function buildRolloutPlan(request: MidMarketAutopilotRequest, overallRisk: RiskLevel): RolloutWave[] {
  const lowRiskSystems = request.systems.filter((system) => system.businessCriticality === "low" || system.businessCriticality === "medium");
  const highRiskSystems = request.systems.filter((system) => system.businessCriticality === "high" || system.businessCriticality === "critical");
  return [
    {
      wave: 1,
      name: "Observe existing systems",
      goal: "Connect read-only inventory, map owners, and start audit evidence capture without mutating customer systems.",
      durationDays: 2,
      exitCriteria: ["all systems inventoried", "owner map complete", "audit/evidence route visible in UI"],
      systems: request.systems.map((system) => system.name),
    },
    {
      wave: 2,
      name: "Gated low-risk automation",
      goal: "Allow low and medium-risk actions through deterministic gates with replayable decisions.",
      durationDays: overallRisk === "critical" ? 4 : 3,
      exitCriteria: ["low-risk PASS actions recorded", "REVIEW actions require approval", "operator monitor shows live status"],
      systems: lowRiskSystems.map((system) => system.name),
    },
    {
      wave: 3,
      name: "Approval-backed critical controls",
      goal: "Add approval, rollback, and escalation for finance, payment, admin, and restricted-data actions.",
      durationDays: highRiskSystems.length ? 5 : 2,
      exitCriteria: ["approver matrix verified", "rollback runbook linked", "evidence export accepted by customer"],
      systems: highRiskSystems.map((system) => system.name),
    },
  ];
}

function buildRuntimeMonitor(overallRisk: RiskLevel): RuntimeMonitorCard[] {
  return [
    { title: "Gate decision rate", metric: "PASS / REVIEW / BLOCK per hour", threshold: "BLOCK > 5% triggers owner review", action: "review" },
    { title: "Invariant drift", metric: "failed invariant count", threshold: "any HARD invariant failure blocks execution", action: "block" },
    { title: "Approval latency", metric: "median time from REVIEW to approve/reject", threshold: "over 4 hours escalates to owner", action: "review" },
    { title: "Evidence freshness", metric: "latest audit export and replay hash age", threshold: overallRisk === "critical" ? "must be < 24h" : "must be < 7d", action: "review" },
  ];
}

function buildConnectionGuide(request: MidMarketAutopilotRequest): string[] {
  const guide = [
    "Start in shadow mode for inventory and evidence capture; do not mutate customer systems during discovery.",
    "Use API/webhook connectors before direct database access; direct database writes stay BLOCKED by default.",
    "Bind each connector to ownerTeam, dataClasses, environment, risk level, and rollback owner before gated execution.",
    "Expose customer value through one operator screen: risk, gate decision, invariant result, audit proof, and next action.",
  ];
  if (request.automationPreference === "autopilot") {
    guide.push("Autopilot can be enabled only after PASS evidence for low-risk actions and human approval for high/critical workflows.");
  }
  return guide;
}

function estimateMonthlyActions(request: MidMarketAutopilotRequest): number {
  const daily = request.systems.reduce((sum, system) => {
    return sum + system.operations.reduce((inner, operation) => inner + Math.max(0, operation.expectedVolumePerDay || 0), 0);
  }, 0);
  return Math.round(daily * 22);
}

function estimateValueScore(
  request: MidMarketAutopilotRequest,
  invariants: InvariantResult[],
  governedActionsPerMonth: number,
): number {
  const painPointBoost = Math.min(20, (request.currentPainPoints || []).length * 5);
  const actionBoost = Math.min(30, Math.floor(governedActionsPerMonth / 150));
  const systemBoost = Math.min(20, request.systems.length * 6);
  const readinessPenalty = invariants.filter((item) => item.status === "BLOCK").length * 35 + invariants.filter((item) => item.status === "REVIEW").length * 8;
  return clamp(45 + painPointBoost + actionBoost + systemBoost - readinessPenalty, 0, 100);
}

function estimateTimeToFirstValueDays(request: MidMarketAutopilotRequest, overallRisk: RiskLevel): number {
  const base = request.systems.length <= 2 ? 3 : request.systems.length <= 5 ? 5 : 8;
  const riskDays = overallRisk === "critical" ? 3 : overallRisk === "high" ? 2 : overallRisk === "medium" ? 1 : 0;
  return base + riskDays;
}

function recommendPackage(
  request: MidMarketAutopilotRequest,
  overallRisk: RiskLevel,
): "starter" | "growth" | "regulated" {
  const hasRestricted = request.systems.some((system) => system.dataClasses.some((dataClass) => ["restricted", "payment", "pii"].includes(dataClass)));
  if (overallRisk === "critical" || hasRestricted) return "regulated";
  if (request.systems.length >= 3 || overallRisk === "high") return "growth";
  return "starter";
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
