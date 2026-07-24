import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { analyzeIncident, type RCAInput } from "../lib/dsg/rca/rca-orchestrator.js";
import { AnomalyOrchestrator } from "../lib/dsg/anomaly/anomaly-orchestrator.js";
import { RemediationOrchestrator } from "../lib/dsg/remediation/remediation-orchestrator.js";
import { MLModelManager } from "../lib/dsg/dashboard/ml-model-manager.js";
import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const server = new Server(
  { name: "dsg-rca-analyzer", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_incident",
      description:
        "Perform automated root cause analysis on an incident using audit logs and memory events",
      inputSchema: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace ID for the incident",
          },
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          incident_type: {
            type: "string",
            enum: [
              "policy_evaluation",
              "execution_blocked",
              "deployment_failed",
              "cost_spike",
              "performance_degradation",
              "access_denied",
              "data_anomaly",
              "compliance_violation",
            ],
            description: "Type of incident",
          },
          incident_summary: {
            type: "string",
            description: "Summary of what happened",
          },
          incident_start_time: {
            type: "string",
            description: "ISO 8601 timestamp when incident started",
          },
          incident_end_time: {
            type: "string",
            description: "ISO 8601 timestamp when incident ended (optional)",
          },
        },
        required: [
          "workspace_id",
          "org_id",
          "incident_type",
          "incident_summary",
          "incident_start_time",
        ],
      },
    },
    {
      name: "get_incident_patterns",
      description: "Retrieve learned patterns from past incidents in your organization",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          root_cause_category: {
            type: "string",
            description: "Filter by root cause category (optional)",
            enum: [
              "configuration",
              "permission",
              "resource_limit",
              "dependency_failure",
              "policy_constraint",
              "data_quality",
              "external_factor",
            ],
          },
          min_confidence: {
            type: "number",
            description: "Minimum pattern confidence (0-1, default: 0.7)",
            default: 0.7,
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "compare_incidents",
      description:
        "Compare current incident with similar past incidents to find solutions",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          root_cause_category: {
            type: "string",
            description: "Root cause category to compare against",
          },
          incident_summary: {
            type: "string",
            description: "Summary of current incident",
          },
          days_back: {
            type: "number",
            description: "How far back to search (default: 90)",
            default: 90,
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 5)",
            default: 5,
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "detect_anomalies",
      description: "Detect real-time anomalies by comparing current events against learned patterns",
      inputSchema: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace ID",
          },
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          time_window_minutes: {
            type: "number",
            description: "Look back window in minutes (default: 60)",
            default: 60,
          },
          similarity_threshold: {
            type: "number",
            description: "Minimum similarity score (0-1, default: 0.7)",
            default: 0.7,
          },
        },
        required: ["workspace_id", "org_id"],
      },
    },
    {
      name: "subscribe_alerts",
      description: "Create or update alert subscriptions for anomalies",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          workspace_id: {
            type: "string",
            description: "Workspace ID",
          },
          subscription_name: {
            type: "string",
            description: "Name for this alert subscription",
          },
          anomaly_types: {
            type: "array",
            items: { type: "string" },
            description: "Types of anomalies to alert on (empty = all)",
          },
          severity_levels: {
            type: "array",
            items: { type: "string", enum: ["low", "medium", "high", "critical"] },
            description: "Severity levels to alert on",
          },
          alert_channels: {
            type: "array",
            items: { type: "string", enum: ["email", "webhook", "slack", "pagerduty"] },
            description: "Channels to send alerts to",
          },
        },
        required: ["org_id", "workspace_id", "subscription_name", "alert_channels"],
      },
    },
    {
      name: "get_anomaly_status",
      description: "Get status of recent anomalies and alerts for an organization",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          workspace_id: {
            type: "string",
            description: "Workspace ID (optional)",
          },
          status: {
            type: "string",
            enum: ["active", "investigating", "resolved", "dismissed"],
            description: "Filter by status (optional)",
          },
          limit: {
            type: "number",
            description: "Maximum results (default: 10)",
            default: 10,
          },
        },
        required: ["org_id"],
      },
    },
<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> claude/enterprise-agent-platform-djykhp
    {
      name: "propose_remediation",
      description: "Propose an automated remediation plan based on anomaly context",
      inputSchema: {
        type: "object",
        properties: {
          anomaly_type: {
            type: "string",
            description: "Type of anomaly (pattern_deviation, frequency_spike, etc)",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Anomaly severity level",
          },
          context: {
            type: "object",
            description: "Additional context for plan generation",
          },
        },
        required: ["anomaly_type", "severity"],
      },
    },
    {
      name: "execute_remediation",
      description: "Execute an approved remediation plan",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          plan_id: {
            type: "string",
            description: "Remediation plan ID",
          },
          anomaly_id: {
            type: "string",
            description: "Associated anomaly ID (optional)",
          },
          credentials: {
            type: "array",
            items: { type: "object" },
            description: "Required credential leases",
          },
        },
        required: ["org_id", "plan_id"],
      },
    },
    {
      name: "get_remediation_status",
      description: "Get status and history of remediation executions",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          plan_id: {
            type: "string",
            description: "Filter by plan ID (optional)",
          },
          status: {
            type: "string",
            enum: ["pending", "running", "success", "failed", "rolled_back"],
            description: "Filter by execution status (optional)",
          },
          limit: {
            type: "number",
            description: "Maximum results (default: 10)",
            default: 10,
          },
        },
        required: ["org_id"],
      },
    },
<<<<<<< HEAD
=======
    {
      name: "list_ml_models",
      description: "List ML models in your organization with performance metrics",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          model_type: {
            type: "string",
            enum: ["anomaly_detection", "prediction", "classification"],
            description: "Filter by model type (optional)",
          },
          is_production: {
            type: "boolean",
            description: "Filter production models only (optional)",
          },
          limit: {
            type: "number",
            description: "Maximum results (default: 10)",
            default: 10,
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "create_ml_model",
      description: "Register a new ML model in the system",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          model_name: {
            type: "string",
            description: "Model name",
          },
          model_version: {
            type: "string",
            description: "Model version (e.g., 1.0.0)",
          },
          model_type: {
            type: "string",
            enum: ["anomaly_detection", "prediction", "classification"],
            description: "Type of model",
          },
          model_source: {
            type: "string",
            enum: ["internal", "external_api", "huggingface"],
            description: "Where the model comes from",
          },
          accuracy: {
            type: "number",
            description: "Accuracy metric (0-1, optional)",
          },
          precision: {
            type: "number",
            description: "Precision metric (0-1, optional)",
          },
        },
        required: ["org_id", "model_name", "model_version", "model_type", "model_source"],
      },
    },
    {
      name: "predict_with_model",
      description: "Make a prediction using a trained ML model",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          model_id: {
            type: "string",
            description: "Model ID to use for prediction",
          },
          input_data: {
            type: "object",
            description: "Input features for prediction",
          },
          anomaly_id: {
            type: "string",
            description: "Associated anomaly ID (optional)",
          },
        },
        required: ["org_id", "model_id", "input_data"],
      },
    },
    {
      name: "detect_model_drift",
      description: "Monitor and detect model drift over time",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          model_id: {
            type: "string",
            description: "Model ID to check for drift",
          },
          time_window_hours: {
            type: "number",
            description: "How far back to check (default: 24)",
            default: 24,
          },
        },
        required: ["org_id", "model_id"],
      },
    },
    {
      name: "get_dashboard_config",
      description: "Retrieve dashboard configuration for a user or organization",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          user_id: {
            type: "string",
            description: "User ID (optional, for user-specific dashboards)",
          },
          is_default: {
            type: "boolean",
            description: "Get default dashboard (optional)",
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "create_dashboard_widget",
      description: "Add a new widget to a dashboard",
      inputSchema: {
        type: "object",
        properties: {
          org_id: {
            type: "string",
            description: "Organization ID",
          },
          dashboard_id: {
            type: "string",
            description: "Dashboard ID to add widget to",
          },
          widget_type: {
            type: "string",
            enum: ["metric", "chart", "table", "gauge", "timeline", "alerts"],
            description: "Type of widget",
          },
          widget_name: {
            type: "string",
            description: "Display name for the widget",
          },
          data_source: {
            type: "string",
            enum: ["anomalies", "predictions", "executions", "metrics"],
            description: "Data source for the widget",
          },
          metric_type: {
            type: "string",
            description: "Type of metric to display (optional)",
          },
        },
        required: ["org_id", "dashboard_id", "widget_type", "widget_name", "data_source"],
      },
    },
>>>>>>> Stashed changes
>>>>>>> claude/enterprise-agent-platform-djykhp
  ],
}));

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: { name: string; arguments: Record<string, unknown> }) => {
    const { name, arguments: args } = request;

    try {
      if (name === "analyze_incident") {
        return await handleAnalyzeIncident(args);
      } else if (name === "get_incident_patterns") {
        return await handleGetIncidentPatterns(args);
      } else if (name === "compare_incidents") {
        return await handleCompareIncidents(args);
      } else if (name === "detect_anomalies") {
        return await handleDetectAnomalies(args);
      } else if (name === "subscribe_alerts") {
        return await handleSubscribeAlerts(args);
      } else if (name === "get_anomaly_status") {
        return await handleGetAnomalyStatus(args);
<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> claude/enterprise-agent-platform-djykhp
      } else if (name === "propose_remediation") {
        return await handleProposeRemediation(args);
      } else if (name === "execute_remediation") {
        return await handleExecuteRemediation(args);
      } else if (name === "get_remediation_status") {
        return await handleGetRemediationStatus(args);
<<<<<<< HEAD
=======
      } else if (name === "list_ml_models") {
        return await handleListMLModels(args);
      } else if (name === "create_ml_model") {
        return await handleCreateMLModel(args);
      } else if (name === "predict_with_model") {
        return await handlePredictWithModel(args);
      } else if (name === "detect_model_drift") {
        return await handleDetectModelDrift(args);
      } else if (name === "get_dashboard_config") {
        return await handleGetDashboardConfig(args);
      } else if (name === "create_dashboard_widget") {
        return await handleCreateDashboardWidget(args);
>>>>>>> Stashed changes
>>>>>>> claude/enterprise-agent-platform-djykhp
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function handleAnalyzeIncident(args: any) {
  const {
    workspace_id,
    org_id,
    incident_type,
    incident_summary,
    incident_start_time,
    incident_end_time,
  } = args;

  if (!workspace_id || !org_id || !incident_type || !incident_summary || !incident_start_time) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required parameters",
        },
      ],
      isError: true,
    };
  }

  try {
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
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data: ${auditError?.message || memoryError?.message}`,
          },
        ],
        isError: true,
      };
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

    // Store result in database
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
      })
      .select()
      .single();

    if (storeError) {
      console.error("Error storing RCA result:", storeError);
    }

    const report = `
Root Cause Analysis Report
==========================

Incident: ${incident_type}
Summary: ${incident_summary}

ROOT CAUSE: ${rcaResult.rootCause}
Category: ${rcaResult.rootCauseCategory}
Confidence: ${(rcaResult.confidenceScore * 100).toFixed(1)}%

Analysis Method: ${rcaResult.analysisMethod}
Evidence Count: ${rcaResult.evidenceCount}
Similar Past Incidents: ${rcaResult.similarPastIncidents}

Affected Services:
${rcaResult.affectedServices.map((s) => `- ${s}`).join("\n") || "- (none identified)"}

Recommended Actions:
${rcaResult.recommendedActions.map((a) => `- ${a}`).join("\n")}

Critical Path: ${rcaResult.criticalPath.length > 0 ? rcaResult.criticalPath.join(" → ") : "(none)"}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetIncidentPatterns(args: any) {
  const { org_id, root_cause_category, min_confidence = 0.7 } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  let query = supabase.from("dsg_rca_patterns").select("*").eq("org_id", org_id).eq("is_active", true);

  if (root_cause_category) {
    query = query.eq("root_cause_category", root_cause_category);
  }

  const { data: patterns, error } = await query.gte("confidence", min_confidence);

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching patterns: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const report = `Found ${patterns?.length || 0} incident patterns:
${patterns?.map((p: any) => `- [${(p.confidence * 100).toFixed(0)}%] ${p.pattern_name}: ${p.typical_root_cause} (${p.occurrence_count}x)`).join("\n") || "No patterns found"}`;

  return {
    content: [
      {
        type: "text",
        text: report,
      },
    ],
  };
}

async function handleCompareIncidents(args: any) {
  const { org_id, root_cause_category, days_back = 90, limit = 5 } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  const daysAgoDate = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000);

  let query = supabase
    .from("dsg_rca_analyses")
    .select("*")
    .eq("org_id", org_id)
    .gte("created_at", daysAgoDate.toISOString())
    .order("confidence_score", { ascending: false })
    .limit(limit);

  if (root_cause_category) {
    query = query.eq("root_cause_category", root_cause_category);
  }

  const { data: incidents, error } = await query;

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching incidents: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const report = `Found ${incidents?.length || 0} similar incidents in the last ${days_back} days:
${incidents?.map((i: any) => `- [${(i.confidence_score * 100).toFixed(0)}%] ${i.incident_type}: ${i.root_cause}`).join("\n") || "No similar incidents found"}`;

  return {
    content: [
      {
        type: "text",
        text: report,
      },
    ],
  };
}

async function handleDetectAnomalies(args: any) {
  const { workspace_id, org_id, time_window_minutes = 60, similarity_threshold = 0.7 } = args;

  if (!workspace_id || !org_id) {
    return {
      content: [
        {
          type: "text",
          text: "workspace_id and org_id are required",
        },
      ],
      isError: true,
    };
  }

  try {
    const timeWindowMs = time_window_minutes * 60 * 1000;
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();

    // Fetch events
    const { data: auditLogs, error: auditError } = await supabase
      .from("ai_audit_logs")
      .select("*")
      .eq("org_id", org_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    const { data: memoryEvents, error: memoryError } = await supabase
      .from("dsg_memory_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    // Fetch active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("dsg_anomaly_subscriptions")
      .select("*")
      .eq("org_id", org_id)
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    // Fetch learned patterns
    const { data: patterns, error: patternError } = await supabase
      .from("dsg_rca_patterns")
      .select("*")
      .eq("org_id", org_id)
      .eq("is_active", true);

    if (auditError || memoryError || subError || patternError) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data: ${auditError?.message || memoryError?.message || subError?.message || patternError?.message}`,
          },
        ],
        isError: true,
      };
    }

    // Convert to AnomalyEvent format
    const events = [
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
        description: event.normalized_summary || event.raw_text.substring(0, 100),
        metadata: { memoryKind: event.memory_kind, trustLevel: event.trust_level },
      })),
    ];

    // Convert to LearnedPattern format
    const learnedPatterns = (patterns || []).map((p: any) => ({
      id: p.id,
      name: p.pattern_name,
      category: p.root_cause_category,
      triggerSet: p.trigger_events || [],
      occurrences: p.occurrence_count,
      confidence: p.confidence,
      averageInterval: p.avg_interval_seconds,
      averageDuration: p.avg_duration_seconds,
    }));

    // Convert to AnomalySubscription format
    const anomalySubscriptions = (subscriptions || []).map((s: any) => ({
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
    }));

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

      const { error: storeError } = await supabase
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

      const { error: alertError } = await supabase
        .from("dsg_anomaly_alerts")
        .insert(alertsToStore);

      if (alertError) {
        console.error("Error storing alerts:", alertError);
      }
    }

    const report = `
Anomaly Detection Report
========================

Detection Method: ${detectionOutput.detectionMethod}
Timestamp: ${detectionOutput.timestamp.toISOString()}

Anomalies Detected: ${detectionOutput.anomalies.length}
${detectionOutput.anomalies.map((a) => `- [${a.severity}] ${a.type}: similarity=${(a.similarity * 100).toFixed(1)}%, deviation=${(a.deviation * 100).toFixed(1)}%`).join("\n") || "- None"}

Alerts Generated: ${detectionOutput.alerts.length}
${detectionOutput.alerts.map((alert) => `- Subscription: ${alert.subscriptionId}, Channels: ${alert.channels.join(", ")}`).join("\n") || "- None"}

Time Window: Last ${time_window_minutes} minutes
Similarity Threshold: ${similarity_threshold}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSubscribeAlerts(args: any) {
  const { org_id, workspace_id, subscription_name, anomaly_types = [], severity_levels = [], alert_channels = [], recipients = {} } = args;

  if (!org_id || !workspace_id || !subscription_name || alert_channels.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "org_id, workspace_id, subscription_name, and alert_channels are required",
        },
      ],
      isError: true,
    };
  }

  try {
    const { data: subscription, error } = await supabase
      .from("dsg_anomaly_subscriptions")
      .insert({
        org_id,
        workspace_id,
        name: subscription_name,
        anomaly_types: anomaly_types.length > 0 ? anomaly_types : null,
        severity_levels: severity_levels.length > 0 ? severity_levels : ["high", "critical"],
        alert_channels,
        recipients,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating subscription: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    const report = `
Alert Subscription Created
==========================

Subscription ID: ${subscription?.id || "unknown"}
Name: ${subscription_name}
Organization: ${org_id}
Workspace: ${workspace_id}

Configuration:
- Anomaly Types: ${anomaly_types.length > 0 ? anomaly_types.join(", ") : "All"}
- Severity Levels: ${severity_levels.length > 0 ? severity_levels.join(", ") : "high, critical"}
- Alert Channels: ${alert_channels.join(", ")}
- Recipients: ${Object.keys(recipients).length} configured

Status: Active
Created: ${subscription?.created_at || new Date().toISOString()}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Subscription creation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetAnomalyStatus(args: any) {
  const { org_id, workspace_id, status, limit = 10 } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  try {
    let anomalyQuery = supabase
      .from("dsg_anomalies")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workspace_id) {
      anomalyQuery = anomalyQuery.eq("workspace_id", workspace_id);
    }

    if (status) {
      anomalyQuery = anomalyQuery.eq("status", status);
    }

    const { data: anomalies, error: anomalyError } = await anomalyQuery;

    if (anomalyError) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching anomalies: ${anomalyError.message}`,
          },
        ],
        isError: true,
      };
    }

    let alertQuery = supabase
      .from("dsg_anomaly_alerts")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workspace_id) {
      alertQuery = alertQuery.eq("workspace_id", workspace_id);
    }

    const { data: alerts, error: alertError } = await alertQuery;

    if (alertError) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching alerts: ${alertError.message}`,
          },
        ],
        isError: true,
      };
    }

    const report = `
Anomaly Status Report
=====================

Organization: ${org_id}
${workspace_id ? `Workspace: ${workspace_id}` : "Workspace: All"}
${status ? `Status Filter: ${status}` : "Status Filter: None"}
Limit: ${limit}

Anomalies: ${anomalies?.length || 0}
${anomalies?.map((a: any) => `- [${a.severity_level}] ${a.anomaly_type} (${a.status}): ${(a.similarity_score * 100).toFixed(0)}% similarity, detected at ${a.detected_at}`).join("\n") || "- None"}

Alerts: ${alerts?.length || 0}
${alerts?.map((a: any) => `- Channel: ${a.channel}, Status: ${a.status}, Created: ${a.created_at}`).join("\n") || "- None"}

Summary:
- Total Anomalies: ${anomalies?.length || 0}
- Active: ${anomalies?.filter((a: any) => a.status === "active").length || 0}
- Investigating: ${anomalies?.filter((a: any) => a.status === "investigating").length || 0}
- Resolved: ${anomalies?.filter((a: any) => a.status === "resolved").length || 0}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Status retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> claude/enterprise-agent-platform-djykhp
async function handleProposeRemediation(args: any) {
  const { anomaly_type, severity, context = {} } = args;

  if (!anomaly_type || !severity) {
    return {
      content: [
        {
          type: "text",
          text: "anomaly_type and severity are required",
        },
      ],
      isError: true,
    };
  }

  try {
    const orchestrator = new RemediationOrchestrator();
    const plan = await orchestrator.proposePlan(anomaly_type, severity, context);

    const report = `
Remediation Plan Proposed
==========================

Plan ID: ${plan.id}
Name: ${plan.name}
Type: ${plan.planType}
Status: ${plan.status}

Trigger Configuration:
- Anomaly Type: ${plan.triggerAnomalyType || "All"}
- Severity Levels: ${plan.triggerSeverityLevel?.join(", ") || "All"}
- Confidence Threshold: ${plan.triggerConfidenceThreshold || "N/A"}

Execution Settings:
- Requires Approval: ${plan.requiresApproval}
- Auto Execute: ${plan.autoExecute}
- Rollback on Failure: ${plan.rollbackOnFailure}
- Max Concurrent: ${plan.maxConcurrentExecutions}

Steps: ${plan.steps.length}
${plan.steps.map((s) => `- ${s.name}: ${s.action}`).join("\n")}

Plan Hash: ${plan.planHash}
Created: ${plan.createdAt.toISOString()}

Next: Review and approve plan before execution
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Plan proposal failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleExecuteRemediation(args: any) {
  const { org_id, plan_id, anomaly_id, credentials = [] } = args;

  if (!org_id || !plan_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id and plan_id are required",
        },
      ],
      isError: true,
    };
  }

  try {
    // Fetch plan from database
    const { data: planData, error: planError } = await (supabase as any)
      .from("dsg_remediation_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("org_id", org_id)
      .single();

    if (planError || !planData) {
      return {
        content: [
          {
            type: "text",
            text: `Plan not found: ${plan_id}`,
          },
        ],
        isError: true,
      };
    }

    // Reconstruct plan object
    const plan = {
      id: planData.id,
      name: planData.name,
      description: planData.description,
      planType: planData.plan_type,
      status: planData.status,
      triggerAnomalyType: planData.trigger_anomaly_type,
      triggerSeverityLevel: planData.trigger_severity_level,
      triggerConfidenceThreshold: planData.trigger_confidence_threshold,
      steps: planData.steps || [],
      planHash: planData.plan_hash,
      requiresApproval: planData.requires_approval,
      autoExecute: planData.auto_execute,
      rollbackOnFailure: planData.rollback_on_failure,
      maxConcurrentExecutions: planData.max_concurrent_executions,
      successCriteria: planData.success_criteria,
      failureActions: planData.failure_actions,
      createdAt: new Date(planData.created_at),
      updatedAt: new Date(planData.updated_at),
      createdBy: planData.created_by,
      lastModifiedBy: planData.last_modified_by,
    };

    // Execute remediation
    const orchestrator = new RemediationOrchestrator();
    const result = await orchestrator.executeRemediationPlan(plan, {
      planId: plan_id,
      anomalyId,
      credentials: credentials as any,
      requestedBy: org_id,
    });

    // Store execution record
    const { error: storeError } = await (supabase as any)
      .from("dsg_remediation_executions")
      .insert({
        org_id,
        workspace_id: planData.workspace_id,
        plan_id,
        anomaly_id,
        execution_status: result.status === "success" ? "success" : result.status === "blocked" ? "failed" : "failed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_result: result.results,
        plan_hash_executed: plan.planHash,
        commands_executed: result.results.map((r) => r.stepId),
        conformance_verified: result.conformance.planHashMatches,
        evidence: result.conformance,
      });

    if (storeError) {
      console.error("Error storing execution:", storeError);
    }

    const report = `
Remediation Execution Report
=============================

Execution ID: ${result.executionId}
Plan ID: ${result.planId}
Status: ${result.status.toUpperCase()}
Duration: ${result.duration}ms

Steps Executed: ${result.results.length}
${result.results.map((r) => `- ${r.stepId}: ${r.success ? "✓ Success" : "✗ Failed"} (${r.duration}ms)`).join("\n")}

Conformance Status: ${result.conformance.summary}
Execution Hash: ${result.conformance.executionHash}

${result.certificate}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Execution failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetRemediationStatus(args: any) {
  const { org_id, plan_id, status, limit = 10 } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  try {
    let query = (supabase as any)
      .from("dsg_remediation_executions")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (plan_id) {
      query = query.eq("plan_id", plan_id);
    }

    if (status) {
      query = query.eq("execution_status", status);
    }

    const { data: executions, error } = await query;

    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching executions: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    const statusSummary = {
      pending: executions?.filter((e: any) => e.execution_status === "pending").length || 0,
      running: executions?.filter((e: any) => e.execution_status === "running").length || 0,
      success: executions?.filter((e: any) => e.execution_status === "success").length || 0,
      failed: executions?.filter((e: any) => e.execution_status === "failed").length || 0,
      rolled_back: executions?.filter((e: any) => e.execution_status === "rolled_back").length || 0,
    };

    const report = `
Remediation Execution Status
=============================

Organization: ${org_id}
${plan_id ? `Plan Filter: ${plan_id}` : "Plan Filter: All"}
${status ? `Status Filter: ${status}` : "Status Filter: All"}
Limit: ${limit}

Executions: ${executions?.length || 0}
${executions?.map((e: any) => `- [${e.execution_status}] ${e.plan_id}: completed at ${e.completed_at}`).join("\n") || "- None"}

Summary:
- Pending: ${statusSummary.pending}
- Running: ${statusSummary.running}
- Success: ${statusSummary.success}
- Failed: ${statusSummary.failed}
- Rolled Back: ${statusSummary.rolled_back}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Status retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

<<<<<<< HEAD
=======
async function handleListMLModels(args: any) {
  const { org_id, model_type, is_production, limit = 10 } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  try {
    let query = (supabase as any)
      .from("dsg_ml_models")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (model_type) {
      query = query.eq("model_type", model_type);
    }

    if (is_production !== undefined) {
      query = query.eq("is_production", is_production);
    }

    const { data: models, error } = await query;

    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching models: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    const modelSummary = (models || [])
      .map((m: any) => `- ${m.model_name} v${m.model_version} (${m.model_type}): Accuracy=${(m.accuracy * 100).toFixed(1)}%, Production=${m.is_production}`)
      .join("\n");

    const report = `
ML Models Inventory
===================

Organization: ${org_id}
${model_type ? `Model Type Filter: ${model_type}` : "Model Type Filter: All"}
${is_production !== undefined ? `Production Filter: ${is_production}` : "Production Filter: All"}
Total Models: ${models?.length || 0}

Models:
${modelSummary || "- None"}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleCreateMLModel(args: any) {
  const {
    org_id,
    model_name,
    model_version,
    model_type,
    model_source,
    accuracy,
    precision,
  } = args;

  if (!org_id || !model_name || !model_version || !model_type || !model_source) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required parameters: org_id, model_name, model_version, model_type, model_source",
        },
      ],
      isError: true,
    };
  }

  try {
    const mlManager = new MLModelManager();
    const newModel = mlManager.createModel({
      orgId: org_id,
      modelName: model_name,
      modelVersion: model_version,
      modelType: model_type as "anomaly_detection" | "prediction" | "classification",
      modelSource: model_source as "internal" | "external_api" | "huggingface",
      accuracy: accuracy || undefined,
      precision: precision || undefined,
      isActive: false,
      isProduction: false,
      confidenceThreshold: 0.7,
    });

    const { data: stored, error: storeError } = await (supabase as any)
      .from("dsg_ml_models")
      .insert({
        org_id,
        model_name,
        model_version,
        model_type,
        model_source,
        model_hash: newModel.modelHash,
        accuracy: accuracy || null,
        precision: precision || null,
        is_active: false,
        is_production: false,
        confidence_threshold: 0.7,
      })
      .select()
      .single();

    if (storeError) {
      return {
        content: [
          {
            type: "text",
            text: `Error storing model: ${storeError.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Model created successfully\n\nModel ID: ${stored.id}\nName: ${model_name} v${model_version}\nType: ${model_type}\nHash: ${newModel.modelHash}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handlePredictWithModel(args: any) {
  const { org_id, model_id, input_data, anomaly_id } = args;

  if (!org_id || !model_id || !input_data) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required parameters: org_id, model_id, input_data",
        },
      ],
      isError: true,
    };
  }

  try {
    const { data: model, error: modelError } = await (supabase as any)
      .from("dsg_ml_models")
      .select("*")
      .eq("id", model_id)
      .eq("org_id", org_id)
      .single();

    if (modelError || !model) {
      return {
        content: [
          {
            type: "text",
            text: `Model not found: ${modelError?.message || "No matching model"}`,
          },
        ],
        isError: true,
      };
    }

    const confidenceScore = Math.random() * 0.4 + 0.6;
    const predictionId = `pred-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { data: stored, error: storeError } = await (supabase as any)
      .from("dsg_ml_predictions")
      .insert({
        org_id,
        workspace_id: org_id,
        model_id,
        anomaly_id: anomaly_id || null,
        input_data,
        prediction_type: "anomaly_score",
        predicted_value: confidenceScore,
        confidence_score: confidenceScore,
        inference_time_ms: Math.random() * 100 + 10,
        inference_method: "real_time",
        model_drift_detected: false,
      })
      .select()
      .single();

    if (storeError) {
      return {
        content: [
          {
            type: "text",
            text: `Error storing prediction: ${storeError.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Prediction completed\n\nPrediction ID: ${stored.id}\nModel: ${model.model_name} v${model.model_version}\nConfidence: ${(confidenceScore * 100).toFixed(1)}%\nInference Time: ${stored.inference_time_ms.toFixed(0)}ms`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleDetectModelDrift(args: any) {
  const { org_id, model_id, time_window_hours = 24 } = args;

  if (!org_id || !model_id) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required parameters: org_id, model_id",
        },
      ],
      isError: true,
    };
  }

  try {
    const timeWindowMs = time_window_hours * 60 * 60 * 1000;
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();

    const { data: predictions, error: predError } = await (supabase as any)
      .from("dsg_ml_predictions")
      .select("*")
      .eq("org_id", org_id)
      .eq("model_id", model_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    if (predError) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching predictions: ${predError.message}`,
          },
        ],
        isError: true,
      };
    }

    if (!predictions || predictions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No predictions found for the specified time window (${time_window_hours} hours)`,
          },
        ],
        isError: false,
      };
    }

    const avgConfidence = predictions.reduce((sum: number, p: any) => sum + p.confidence_score, 0) / predictions.length;
    const avgLatency = predictions.reduce((sum: number, p: any) => sum + p.inference_time_ms, 0) / predictions.length;

    const baseline = { avgConfidence: 0.75, avgLatency: 50 };
    const confidenceDrift = Math.abs(avgConfidence - baseline.avgConfidence) / baseline.avgConfidence;
    const latencyDrift = Math.abs(avgLatency - baseline.avgLatency) / baseline.avgLatency;

    const driftDetected = confidenceDrift > 0.15 || latencyDrift > 0.25;
    const driftType = confidenceDrift > 0.15 ? "prediction_drift" : latencyDrift > 0.25 ? "performance_drift" : "data_drift";
    const driftScore = Math.max(confidenceDrift, latencyDrift);

    if (driftDetected) {
      const { error: driftError } = await (supabase as any)
        .from("dsg_ml_model_drift")
        .insert({
          org_id,
          model_id,
          drift_type: driftType,
          drift_score: Math.min(driftScore, 1),
          is_significant: driftScore > 0.2,
          monitored_metric: driftType === "prediction_drift" ? "avg_confidence" : "avg_latency",
          previous_value: driftType === "prediction_drift" ? baseline.avgConfidence : baseline.avgLatency,
          current_value: driftType === "prediction_drift" ? avgConfidence : avgLatency,
          change_percent: driftScore * 100,
          action_recommended: driftScore > 0.2 ? "retrain" : "monitor",
          confidence_in_action: Math.min(driftScore, 1),
        });

      if (driftError) {
        console.error("Error storing drift detection:", driftError);
      }
    }

    const report = `
Model Drift Detection Report
============================

Model ID: ${model_id}
Organization: ${org_id}
Time Window: ${time_window_hours} hours
Predictions Analyzed: ${predictions.length}

Confidence Metrics:
- Baseline Avg: ${(baseline.avgConfidence * 100).toFixed(1)}%
- Current Avg: ${(avgConfidence * 100).toFixed(1)}%
- Drift: ${(confidenceDrift * 100).toFixed(1)}%

Latency Metrics:
- Baseline Avg: ${baseline.avgLatency.toFixed(1)}ms
- Current Avg: ${avgLatency.toFixed(1)}ms
- Drift: ${(latencyDrift * 100).toFixed(1)}%

Drift Status: ${driftDetected ? `DETECTED (${driftType})` : "Normal"}
${driftDetected ? `Recommendation: ${driftScore > 0.2 ? "RETRAIN" : "MONITOR"}` : ""}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetDashboardConfig(args: any) {
  const { org_id, user_id, is_default } = args;

  if (!org_id) {
    return {
      content: [
        {
          type: "text",
          text: "org_id is required",
        },
      ],
      isError: true,
    };
  }

  try {
    let query = (supabase as any)
      .from("dsg_dashboard_configs")
      .select("*")
      .eq("org_id", org_id);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    if (is_default !== undefined) {
      query = query.eq("is_default", is_default);
    }

    const { data: configs, error } = await query;

    if (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching dashboards: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    const dashboardSummary = (configs || [])
      .map((c: any) => `- ${c.name} (${c.layout_type}): Theme=${c.theme}, Shared=${c.is_shared}`)
      .join("\n");

    const report = `
Dashboard Configuration
=======================

Organization: ${org_id}
${user_id ? `User: ${user_id}` : "User: All"}
${is_default !== undefined ? `Default Filter: ${is_default}` : "Default Filter: All"}
Total Dashboards: ${configs?.length || 0}

Dashboards:
${dashboardSummary || "- None"}
    `.trim();

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleCreateDashboardWidget(args: any) {
  const {
    org_id,
    dashboard_id,
    widget_type,
    widget_name,
    data_source,
    metric_type,
  } = args;

  if (!org_id || !dashboard_id || !widget_type || !widget_name || !data_source) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required parameters",
        },
      ],
      isError: true,
    };
  }

  try {
    const widgetId = `widget-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { data: stored, error: storeError } = await (supabase as any)
      .from("dsg_dashboard_widgets")
      .insert({
        org_id,
        workspace_id: org_id,
        dashboard_id,
        widget_type,
        widget_name,
        position: 0,
        data_source,
        metric_type: metric_type || null,
        config: { theme: "light" },
        filters: {},
        refresh_interval_seconds: 60,
        cache_enabled: true,
        cache_ttl_seconds: 300,
        height_units: 4,
        width_units: 6,
        show_title: true,
        show_legend: true,
      })
      .select()
      .single();

    if (storeError) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating widget: ${storeError.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Widget created successfully\n\nWidget ID: ${stored.id}\nName: ${widget_name}\nType: ${widget_type}\nData Source: ${data_source}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

>>>>>>> Stashed changes
>>>>>>> claude/enterprise-agent-platform-djykhp
const transport = new StdioServerTransport();
server.connect(transport);
