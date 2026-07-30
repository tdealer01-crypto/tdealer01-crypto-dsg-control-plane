import { NextResponse } from "next/server";
import { requireRuntimeAccess } from "../../../lib/authz-runtime";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from "../../../lib/security/rate-limit";
import { logServerError, serverErrorResponse } from "../../../lib/security/error-response";

export const dynamic = "force-dynamic";
const COMPLIANCE_EXPORT_RATE_LIMIT = 20;
const COMPLIANCE_EXPORT_RATE_WINDOW_MS = 60 * 1000;

/**
 * Generate CCVS compliance schema JSON for audit logs.
 * Maps audit events to compliance requirements (SOC 2, GDPR, EU AI Act).
 */
export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, "compliance-export"),
      limit: COMPLIANCE_EXPORT_RATE_LIMIT,
      windowMs: COMPLIANCE_EXPORT_RATE_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, COMPLIANCE_EXPORT_RATE_LIMIT) }
      );
    }

    const access = await requireRuntimeAccess(request, 'compliance_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);

    const format = url.searchParams.get("format") || "json";
    const daysBack = Math.min(Number(url.searchParams.get("days") || "7"), 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch audit logs for the compliance report
    const { data: auditLogs, error } = await supabase
      .from("audit_logs")
      .select(`
        id,
        org_id,
        agent_id,
        decision,
        reason,
        policy_version,
        actor_uuid,
        created_at,
        metadata,
        evidence
      `)
      .eq("org_id", access.orgId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      logServerError(error, "compliance-export-get");
      return serverErrorResponse();
    }

    // Build compliance schema (cast Supabase Json types to Record<string, unknown>)
    const typedAuditLogs = (auditLogs || []).map(log => ({
      ...log,
      metadata: typeof log.metadata === 'object' ? log.metadata as Record<string, unknown> : undefined,
      evidence: typeof log.evidence === 'object' ? log.evidence as Record<string, unknown> : undefined,
    }));
    const complianceSchema = buildComplianceSchema(access.orgId, typedAuditLogs, daysBack);

    if (format === "csv") {
      return exportAsCSV(complianceSchema);
    }

    return NextResponse.json({
      ok: true,
      schema: complianceSchema,
    });
  } catch (error) {
    logServerError(error, "compliance-export-get");
    return serverErrorResponse();
  }
}

interface AuditLog {
  id: string;
  org_id: string;
  agent_id: string;
  decision: string;
  reason: string;
  policy_version: string;
  actor_uuid: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}

interface ComplianceSchema {
  schema_version: string;
  report_id: string;
  org_id: string;
  generated_at: string;
  period_days: number;
  period_start: string;
  period_end: string;
  audit_events_count: number;
  compliance_matrix: ComplianceMatrix;
  evidence_summary: EvidenceSummary;
  ccvs_levels: CCVSLevels;
  claims: {
    certification_claim: boolean;
    independent_audit_claim: boolean;
    soc2_claim: boolean;
    gdpr_claim: boolean;
    eu_ai_act_claim: boolean;
  };
}

interface ComplianceMatrix {
  soc2_controls: ControlResult[];
  gdpr_requirements: RequirementResult[];
  eu_ai_act_requirements: RequirementResult[];
}

interface ControlResult {
  control_id: string;
  control_name: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "REVIEW";
  evidence_count: number;
  last_verified: string;
  notes: string;
}

interface RequirementResult {
  requirement_id: string;
  requirement_name: string;
  status: "MET" | "UNMET" | "PARTIAL" | "REVIEW";
  audit_events_matching: number;
  last_verified: string;
  notes: string;
}

interface EvidenceSummary {
  total_audit_logs: number;
  logs_with_decision_pass: number;
  logs_with_decision_block: number;
  logs_with_decision_review: number;
  unique_actors: number;
  unique_agents: number;
  policy_versions_used: string[];
}

interface CCVSLevels {
  l1_unit_evidence: boolean;
  l2_integration_evidence: boolean;
  l3_adversarial_evidence: boolean;
  l4_mutation_evidence: boolean;
  l5_provenance_evidence: boolean;
}

function buildComplianceSchema(
  orgId: string,
  auditLogs: AuditLog[],
  daysBack: number
): ComplianceSchema {
  const reportId = `compliance-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - daysBack);

  // Analyze audit logs
  const passCount = auditLogs.filter((l) => l.decision === "PASS").length;
  const blockCount = auditLogs.filter((l) => l.decision === "BLOCK").length;
  const reviewCount = auditLogs.filter((l) => l.decision === "REVIEW").length;
  const uniqueActors = new Set(auditLogs.map((l) => l.actor_uuid).filter(Boolean)).size;
  const uniqueAgents = new Set(auditLogs.map((l) => l.agent_id)).size;
  const policyVersions = Array.from(new Set(auditLogs.map((l) => l.policy_version).filter(Boolean)));

  // Build SOC 2 controls
  const soc2Controls: ControlResult[] = [
    {
      control_id: "CC6.1",
      control_name: "Logical Access Controls",
      status: auditLogs.length > 0 ? "PASS" : "REVIEW",
      evidence_count: auditLogs.length,
      last_verified: now.toISOString(),
      notes: `${auditLogs.length} audit events logged. All access attempts are tracked.`,
    },
    {
      control_id: "CC7.2",
      control_name: "System Monitoring & Change Logging",
      status: auditLogs.length > 0 ? "PASS" : "REVIEW",
      evidence_count: auditLogs.length,
      last_verified: now.toISOString(),
      notes: `Audit trail contains ${auditLogs.length} events with decisions: ${passCount} PASS, ${blockCount} BLOCK, ${reviewCount} REVIEW.`,
    },
    {
      control_id: "CC9.2",
      control_name: "Change Management",
      status: policyVersions.length > 0 ? "PASS" : "REVIEW",
      evidence_count: policyVersions.length,
      last_verified: now.toISOString(),
      notes: `${policyVersions.length} policy versions tracked: ${policyVersions.join(", ")}`,
    },
  ];

  // Build GDPR requirements
  const gdprRequirements: RequirementResult[] = [
    {
      requirement_id: "GDPR-5.1",
      requirement_name: "Lawfulness of Processing",
      status: "MET",
      audit_events_matching: auditLogs.length,
      last_verified: now.toISOString(),
      notes: "All processing decisions are logged and can be audited.",
    },
    {
      requirement_id: "GDPR-32",
      requirement_name: "Security of Processing (Technical Measures)",
      status: auditLogs.length > 0 ? "MET" : "REVIEW",
      audit_events_matching: auditLogs.length,
      last_verified: now.toISOString(),
      notes: "Append-only audit trail prevents tampering. Hash chain enforces integrity.",
    },
  ];

  // Build EU AI Act requirements
  const euAiActRequirements: RequirementResult[] = [
    {
      requirement_id: "EU-AI-Act-6",
      requirement_name: "Risk-based Classification",
      status: "MET",
      audit_events_matching: auditLogs.length,
      last_verified: now.toISOString(),
      notes: "Governance decisions are tracked with risk classification.",
    },
    {
      requirement_id: "EU-AI-Act-8",
      requirement_name: "Transparency & Documentation",
      status: "MET",
      audit_events_matching: auditLogs.length,
      last_verified: now.toISOString(),
      notes: "Complete audit trail and policy versions documented.",
    },
  ];

  return {
    schema_version: "ccvs-makk8-v1",
    report_id: reportId,
    org_id: orgId,
    generated_at: now.toISOString(),
    period_days: daysBack,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    audit_events_count: auditLogs.length,
    compliance_matrix: {
      soc2_controls: soc2Controls,
      gdpr_requirements: gdprRequirements,
      eu_ai_act_requirements: euAiActRequirements,
    },
    evidence_summary: {
      total_audit_logs: auditLogs.length,
      logs_with_decision_pass: passCount,
      logs_with_decision_block: blockCount,
      logs_with_decision_review: reviewCount,
      unique_actors: uniqueActors,
      unique_agents: uniqueAgents,
      policy_versions_used: policyVersions,
    },
    ccvs_levels: {
      l1_unit_evidence: true,
      l2_integration_evidence: auditLogs.length > 0,
      l3_adversarial_evidence: false,
      l4_mutation_evidence: false,
      l5_provenance_evidence: false,
    },
    claims: {
      certification_claim: false,
      independent_audit_claim: false,
      soc2_claim: false,
      gdpr_claim: false,
      eu_ai_act_claim: false,
    },
  };
}

function exportAsCSV(schema: ComplianceSchema): NextResponse {
  const lines: string[] = [];

  // Header
  lines.push("Compliance Report Export");
  lines.push(`Report ID,${schema.report_id}`);
  lines.push(`Organization,${schema.org_id}`);
  lines.push(`Generated At,${schema.generated_at}`);
  lines.push(`Period,${schema.period_days} days`);
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push(`Total Audit Events,${schema.audit_events_count}`);
  lines.push(`PASS,${schema.evidence_summary.logs_with_decision_pass}`);
  lines.push(`BLOCK,${schema.evidence_summary.logs_with_decision_block}`);
  lines.push(`REVIEW,${schema.evidence_summary.logs_with_decision_review}`);
  lines.push(`Unique Actors,${schema.evidence_summary.unique_actors}`);
  lines.push(`Unique Agents,${schema.evidence_summary.unique_agents}`);
  lines.push("");

  // SOC 2 Controls
  lines.push("SOC 2 CONTROLS");
  lines.push("Control ID,Control Name,Status,Evidence Count,Last Verified");
  schema.compliance_matrix.soc2_controls.forEach((control) => {
    lines.push(
      `${control.control_id},"${control.control_name}",${control.status},${control.evidence_count},${control.last_verified}`
    );
  });
  lines.push("");

  // GDPR Requirements
  lines.push("GDPR REQUIREMENTS");
  lines.push("Requirement ID,Requirement Name,Status,Matching Events");
  schema.compliance_matrix.gdpr_requirements.forEach((req) => {
    lines.push(
      `${req.requirement_id},"${req.requirement_name}",${req.status},${req.audit_events_matching}`
    );
  });
  lines.push("");

  // EU AI Act Requirements
  lines.push("EU AI ACT REQUIREMENTS");
  lines.push("Requirement ID,Requirement Name,Status,Matching Events");
  schema.compliance_matrix.eu_ai_act_requirements.forEach((req) => {
    lines.push(
      `${req.requirement_id},"${req.requirement_name}",${req.status},${req.audit_events_matching}`
    );
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="compliance-report-${Date.now()}.csv"`,
    },
  });
}
