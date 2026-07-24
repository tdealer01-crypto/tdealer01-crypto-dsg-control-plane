import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { AnomalyOrchestrator } from "@/lib/dsg/anomaly/anomaly-orchestrator";
import type {
  AnomalyEvent,
  LearnedPattern,
} from "@/lib/dsg/anomaly/anomaly-detector";
import type { AnomalySubscription } from "@/lib/dsg/anomaly/anomaly-orchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      workspace_id,
      org_id,
      time_window_minutes = 60,
      similarity_threshold = 0.7,
    } = body;

    if (!workspace_id || !org_id) {
      return NextResponse.json(
        { error: "workspace_id and org_id are required" },
        { status: 400 }
      );
    }

    const timeWindowMs = time_window_minutes * 60 * 1000;
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();

    // Fetch events
    const { data: auditLogs, error: auditError } = await (supabase as any)
      .from("ai_audit_logs")
      .select("*")
      .eq("org_id", org_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    const { data: memoryEvents, error: memoryError } = await (supabase as any)
      .from("dsg_memory_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    // Fetch active subscriptions
    const { data: subscriptions, error: subError } = await (supabase as any)
      .from("dsg_anomaly_subscriptions")
      .select("*")
      .eq("org_id", org_id)
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    // Fetch learned patterns
    const { data: patterns, error: patternError } = await (supabase as any)
      .from("dsg_rca_patterns")
      .select("*")
      .eq("org_id", org_id)
      .eq("is_active", true);

    if (auditError || memoryError || subError || patternError) {
      return NextResponse.json(
        {
          error: "Failed to fetch data",
          message:
            auditError?.message ||
            memoryError?.message ||
            subError?.message ||
            patternError?.message,
        },
        { status: 500 }
      );
    }

    // Convert to AnomalyEvent format
    const events: AnomalyEvent[] = [
      ...(auditLogs || []).map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.created_at),
        type: `audit:${log.event_type}`,
        description: `${log.decision}: ${log.decision_reason}`,
        metadata: { eventType: log.event_type, decision: log.decision },
      })),
      ...(memoryEvents || []).map((event: any) => ({
        id: event.id,
        timestamp: new Date(event.created_at),
        type: `memory:${event.memory_kind}`,
        description:
          event.normalized_summary ||
          event.raw_text.substring(0, 100),
        metadata: { memoryKind: event.memory_kind, trustLevel: event.trust_level },
      })),
    ];

    // Convert to LearnedPattern format
    const learnedPatterns: LearnedPattern[] = (patterns || []).map(
      (p: any) => ({
        id: p.id,
        name: p.pattern_name,
        category: p.root_cause_category,
        triggerSet: p.trigger_events || [],
        occurrences: p.occurrence_count,
        confidence: p.confidence,
        averageInterval: p.avg_interval_seconds,
        averageDuration: p.avg_duration_seconds,
      })
    );

    // Convert to AnomalySubscription format
    const anomalySubscriptions: AnomalySubscription[] = (subscriptions || []).map(
      (s: any) => ({
        id: s.id,
        orgId: s.org_id,
        workspaceId: s.workspace_id,
        name: s.name,
        anomalyTypes: s.anomaly_types || [],
        minSimilarityScore: s.min_similarity_score || 0.7,
        severityLevels: s.severity_levels || ["high", "critical"],
        alertChannels: s.alert_channels || [],
        recipients: s.recipients || {},
        autoInvestigate: s.auto_investigate || false,
        autoResolveThreshold: s.auto_resolve_threshold,
        isActive: s.is_active,
      })
    );

    // Run detection
    const orchestrator = new AnomalyOrchestrator();
    const detectionOutput = await orchestrator.detectAndAlert({
      workspaceId: workspace_id,
      orgId: org_id,
      events,
      patterns: learnedPatterns,
      subscriptions: anomalySubscriptions,
    });

    // Store detected anomalies
    if (detectionOutput.anomalies.length > 0) {
      const anomaliesToStore = detectionOutput.anomalies.map((a) => ({
        org_id,
        workspace_id,
        detected_at: new Date().toISOString(),
        detection_method: detectionOutput.detectionMethod,
        anomaly_type: a.type,
        matched_pattern_id: a.patternId,
        similarity_score: a.similarity,
        deviation_score: a.deviation,
        severity_level: a.severity,
        status: "active",
        detection_evidence: a.evidence,
      }));

      const { error: storeError } = await (supabase as any)
        .from("dsg_anomalies")
        .insert(anomaliesToStore);

      if (storeError) {
        console.error("Error storing anomalies:", storeError);
      }
    }

    // Store alerts
    if (detectionOutput.alerts.length > 0) {
      const alertsToStore = detectionOutput.alerts.map((a) => ({
        org_id,
        workspace_id,
        anomaly_id: a.anomalyId,
        alert_type: "anomaly_detected",
        channel: a.channels[0] || "webhook",
        status: "pending",
        recipients: a.recipients,
      }));

      const { error: alertError } = await (supabase as any)
        .from("dsg_anomaly_alerts")
        .insert(alertsToStore);

      if (alertError) {
        console.error("Error storing alerts:", alertError);
      }
    }

    return NextResponse.json(
      {
        detection_method: detectionOutput.detectionMethod,
        timestamp: detectionOutput.timestamp.toISOString(),
        anomalies_detected: detectionOutput.anomalies.length,
        anomalies: detectionOutput.anomalies,
        alerts_generated: detectionOutput.alerts.length,
        alerts: detectionOutput.alerts,
        time_window_minutes,
        similarity_threshold,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    return NextResponse.json(
      {
        error: "Failed to detect anomalies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
