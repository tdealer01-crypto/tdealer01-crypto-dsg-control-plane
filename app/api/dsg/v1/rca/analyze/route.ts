import { NextResponse } from "next/server";
import { analyzeIncident, type RCAInput } from "@/lib/dsg/rca/rca-orchestrator";
import { createClient } from "@supabase/supabase-js";
import { readJsonBody } from "@/lib/security/body-safety";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, 1024 * 50); // 50KB limit

    const {
      workspace_id,
      org_id,
      incident_type,
      incident_summary,
      incident_start_time,
      incident_end_time,
    } = body;

    // Validation
    if (!workspace_id || !org_id || !incident_type || !incident_summary || !incident_start_time) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: [
            "workspace_id",
            "org_id",
            "incident_type",
            "incident_summary",
            "incident_start_time",
          ],
        },
        { status: 400 }
      );
    }

    // Fetch audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from("ai_audit_logs")
      .select("*")
      .eq("org_id", org_id)
      .gte("created_at", incident_start_time)
      .lte(
        "created_at",
        incident_end_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: true });

    // Fetch memory events
    const { data: memoryEvents, error: memoryError } = await supabase
      .from("dsg_memory_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("created_at", incident_start_time)
      .lte(
        "created_at",
        incident_end_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: true });

    if (auditError || memoryError) {
      return NextResponse.json(
        {
          error: "Failed to fetch incident data",
          details: auditError?.message || memoryError?.message,
        },
        { status: 500 }
      );
    }

    // Convert to timeline events
    const auditTimelineEvents = (auditLogs || []).map((log: any) => ({
      id: log.id,
      timestamp: new Date(log.created_at),
      type: "audit" as const,
      description: `${log.event_type}: ${log.decision} (${log.decision_reason})`,
      metadata: {
        eventType: log.event_type,
        decision: log.decision,
        action: log.action,
      },
    }));

    const memoryTimelineEvents = (memoryEvents || []).map((event: any) => ({
      id: event.id,
      timestamp: new Date(event.created_at),
      type: "memory" as const,
      description: `${event.memory_kind}: ${event.normalized_summary || event.raw_text.substring(0, 100)}`,
      metadata: {
        memoryKind: event.memory_kind,
        trustLevel: event.trust_level,
      },
    }));

    // Run RCA analysis
    const rcaInput: RCAInput = {
      workspaceId: workspace_id,
      orgId: org_id,
      incidentType: incident_type,
      incidentSummary: incident_summary,
      incidentStartTime: new Date(incident_start_time),
      incidentEndTime: incident_end_time ? new Date(incident_end_time) : undefined,
      auditLogs: auditTimelineEvents,
      memoryEvents: memoryTimelineEvents,
    };

    const rcaResult = await analyzeIncident(rcaInput);

    // Store result
    const { data: stored, error: storeError } = await supabase
      .from("dsg_rca_analyses")
      .insert({
        org_id,
        workspace_id,
        incident_type,
        incident_summary,
        incident_start_time,
        incident_end_time,
        root_cause: rcaResult.rootCause,
        root_cause_category: rcaResult.rootCauseCategory,
        confidence_score: rcaResult.confidenceScore,
        evidence_count: rcaResult.evidenceCount,
        affected_services: rcaResult.affectedServices,
        analysis_method: rcaResult.analysisMethod,
        similar_past_incidents: rcaResult.similarPastIncidents,
        recommended_action: rcaResult.recommendedActions.join("; "),
        severity_level: deriveSeverity(rcaResult.confidenceScore),
      })
      .select()
      .single();

    if (storeError) {
      console.error("Error storing RCA result:", storeError);
    }

    return NextResponse.json(
      {
        id: stored?.id || rcaResult.id,
        root_cause: rcaResult.rootCause,
        root_cause_category: rcaResult.rootCauseCategory,
        confidence_score: rcaResult.confidenceScore,
        analysis_method: rcaResult.analysisMethod,
        affected_services: rcaResult.affectedServices,
        recommended_actions: rcaResult.recommendedActions,
        evidence_count: rcaResult.evidenceCount,
        similar_past_incidents: rcaResult.similarPastIncidents,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RCA analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function deriveSeverity(confidenceScore: number): string {
  if (confidenceScore >= 0.85) return "critical";
  if (confidenceScore >= 0.70) return "high";
  if (confidenceScore >= 0.50) return "medium";
  return "low";
}
