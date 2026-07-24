import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface MemoryEvent {
  id: string;
  workspace_id: string;
  source_type: string;
  memory_kind: string;
  raw_text: string;
  normalized_summary: string;
  trust_level: string;
  created_at: string;
}

interface PolicyRecord {
  id: string;
  org_id: string;
  name: string;
  description: string;
  policy_type: string;
  risk_level: string;
  enabled: boolean;
  version: number;
  rules: any[];
}

interface AuditLog {
  id: string;
  org_id: string;
  event_type: string;
  action: string;
  decision: string;
  decision_reason: string;
  actor_type: string;
  created_at: string;
  execution_details: any;
}

const server = new Server(
  { name: "dsg-context-discovery", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_memory_events",
      description:
        "Search agent memory events to discover previous episodes, decisions, and patterns",
      inputSchema: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace ID to query within",
          },
          memory_kind: {
            type: "string",
            enum: [
              "policy",
              "decision",
              "evidence",
              "workflow",
              "command",
              "all",
            ],
            description: "Type of memory to search for",
          },
          trust_level: {
            type: "string",
            enum: ["observed", "verified", "user_supplied", "system_generated"],
            description: "Filter by trust level (verified is highest confidence)",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 10)",
            default: 10,
          },
          days_back: {
            type: "number",
            description: "Search within last N days (default: 30)",
            default: 30,
          },
        },
        required: ["workspace_id", "memory_kind"],
      },
    },
    {
      name: "query_policies",
      description:
        "Retrieve active governance policies applicable to an organization",
      inputSchema: {
        type: "object",
        properties: {
          org_id: { type: "string", description: "Organization ID" },
          policy_type: {
            type: "string",
            enum: [
              "deployment",
              "execution",
              "data_handling",
              "compliance",
              "all",
            ],
            description: "Filter by policy type",
          },
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high", "critical", "all"],
            description: "Filter by minimum risk level",
          },
          enabled_only: {
            type: "boolean",
            description: "Return only enabled policies (default: true)",
            default: true,
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "query_audit_logs",
      description:
        "Search audit trail to understand decision history and patterns",
      inputSchema: {
        type: "object",
        properties: {
          org_id: { type: "string", description: "Organization ID" },
          event_type: {
            type: "string",
            description:
              "Filter by event type (e.g., policy_evaluation, execution_blocked)",
          },
          decision: {
            type: "string",
            enum: ["pass", "review", "block", "unsupported"],
            description: "Filter by decision outcome",
          },
          days_back: {
            type: "number",
            description: "Search within last N days (default: 7)",
            default: 7,
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 10)",
            default: 10,
          },
        },
        required: ["org_id"],
      },
    },
    {
      name: "get_context_pack",
      description:
        "Build a context bundle from memory, policies, and audit history for decision-making",
      inputSchema: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace ID for context scope",
          },
          org_id: {
            type: "string",
            description: "Organization ID for policy/audit scope",
          },
          purpose: {
            type: "string",
            enum: [
              "planning",
              "approval_review",
              "runtime_execution",
              "verification",
            ],
            description: "Purpose of the context pack",
          },
          topic: {
            type: "string",
            description:
              "Topic or query to focus context gathering (e.g., 'deployment_failure', 'cost_spike')",
          },
        },
        required: ["workspace_id", "org_id", "purpose"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  try {
    if (name === "query_memory_events") {
      return await handleQueryMemoryEvents(args);
    } else if (name === "query_policies") {
      return await handleQueryPolicies(args);
    } else if (name === "query_audit_logs") {
      return await handleQueryAuditLogs(args);
    } else if (name === "get_context_pack") {
      return await handleGetContextPack(args);
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
});

async function handleQueryMemoryEvents(args: any) {
  const {
    workspace_id,
    memory_kind,
    trust_level,
    limit = 10,
    days_back = 30,
  } = args;

  let query = supabase
    .from("dsg_memory_events")
    .select("*")
    .eq("workspace_id", workspace_id);

  if (memory_kind !== "all") {
    query = query.eq("memory_kind", memory_kind);
  }

  if (trust_level) {
    query = query.eq("trust_level", trust_level);
  }

  const daysAgoDate = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000);
  query = query.gte("created_at", daysAgoDate.toISOString());

  const { data, error } = await query
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error querying memory: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const summary = `Found ${data?.length || 0} memory events (${memory_kind}):
${data?.map((e: MemoryEvent) => `- [${e.trust_level}] ${e.memory_kind}: ${e.normalized_summary || e.raw_text.substring(0, 100)}`).join("\n") || "No events found"}`;

  return {
    content: [
      {
        type: "text",
        text: summary,
      },
    ],
  };
}

async function handleQueryPolicies(args: any) {
  const { org_id, policy_type, risk_level, enabled_only = true } = args;

  let query = supabase
    .from("ai_policies")
    .select("*")
    .eq("org_id", org_id);

  if (enabled_only) {
    query = query.eq("enabled", true);
  }

  if (policy_type !== "all" && policy_type) {
    query = query.eq("policy_type", policy_type);
  }

  const { data, error } = await query.order("risk_level", { ascending: false });

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error querying policies: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const filtered = data?.filter((p: PolicyRecord) => {
    if (!risk_level || risk_level === "all") return true;
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return (
      riskOrder[p.risk_level as keyof typeof riskOrder] >=
      riskOrder[risk_level as keyof typeof riskOrder]
    );
  });

  const summary = `Found ${filtered?.length || 0} policies:
${filtered?.map((p: PolicyRecord) => `- [${p.risk_level}] ${p.name} (v${p.version}): ${p.description}`).join("\n") || "No policies found"}`;

  return {
    content: [
      {
        type: "text",
        text: summary,
      },
    ],
  };
}

async function handleQueryAuditLogs(args: any) {
  const { org_id, event_type, decision, days_back = 7, limit = 10 } = args;

  let query = supabase
    .from("ai_audit_logs")
    .select("*")
    .eq("org_id", org_id);

  if (event_type) {
    query = query.eq("event_type", event_type);
  }

  if (decision) {
    query = query.eq("decision", decision);
  }

  const daysAgoDate = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000);
  query = query.gte("created_at", daysAgoDate.toISOString());

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error querying audit logs: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  const summary = `Found ${data?.length || 0} audit entries:
${data?.map((a: AuditLog) => `- [${a.decision}] ${a.event_type} (${a.action}): ${a.decision_reason}`).join("\n") || "No audit entries found"}`;

  return {
    content: [
      {
        type: "text",
        text: summary,
      },
    ],
  };
}

async function handleGetContextPack(args: any) {
  const { workspace_id, org_id, purpose, topic } = args;

  try {
    // Gather memory, policies, and recent decisions
    const [memoryRes, policyRes, auditRes] = await Promise.all([
      supabase
        .from("dsg_memory_events")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_policies")
        .select("*")
        .eq("org_id", org_id)
        .eq("enabled", true)
        .limit(5),
      supabase
        .from("ai_audit_logs")
        .select("*")
        .eq("org_id", org_id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const memoryIds = memoryRes.data?.map((m: MemoryEvent) => m.id) || [];
    const contextText = `
Context Pack for: ${purpose}
${topic ? `Topic: ${topic}` : ""}

RECENT DECISIONS:
${auditRes.data?.map((a: AuditLog) => `- ${a.event_type}: ${a.decision} (${a.decision_reason})`).join("\n") || "None"}

ACTIVE POLICIES:
${policyRes.data?.map((p: PolicyRecord) => `- ${p.name} [${p.risk_level}]: ${p.description}`).join("\n") || "None"}

MEMORY CONTEXT:
${memoryRes.data?.map((m: MemoryEvent) => `- [${m.memory_kind}] ${m.normalized_summary || m.raw_text.substring(0, 100)}`).join("\n") || "None"}
    `.trim();

    // Store context pack
    const { data: contextPack, error: packError } = await supabase
      .from("dsg_memory_context_packs")
      .insert({
        workspace_id,
        actor_id: "system",
        purpose,
        memory_ids: memoryIds,
        context_text: contextText,
        context_hash: createHash("sha256")
          .update(contextText)
          .digest("hex"),
        gate_status: "PASS",
      })
      .select()
      .single();

    if (packError) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating context pack: ${packError.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Context pack created (${contextPack.id}):\n\n${contextText}`,
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

const transport = new StdioServerTransport();
server.connect(transport);
