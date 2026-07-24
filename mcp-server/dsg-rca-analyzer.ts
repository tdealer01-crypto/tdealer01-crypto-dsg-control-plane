import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { analyzeIncident, type RCAInput } from "../lib/dsg/rca/rca-orchestrator.js";
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

const transport = new StdioServerTransport();
server.connect(transport);
