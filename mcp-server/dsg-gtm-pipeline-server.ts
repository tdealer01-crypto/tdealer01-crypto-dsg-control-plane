/**
 * DSG GTM Pipeline MCP Server
 *
 * Provides tools for:
 * - Target customer tracking and management
 * - Demo scheduling and follow-up
 * - Pilot project management
 * - Revenue tracking and reporting
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface GTMTarget {
  id: string;
  company: string;
  contact: string;
  email: string;
  status: "prospect" | "engaged" | "pilot" | "customer";
  createdAt: Date;
  lastContact?: Date;
  demoScheduled?: Date;
  revenueExpected?: number;
}

interface DemoCall {
  id: string;
  targetId: string;
  scheduledAt: Date;
  duration: number; // in minutes
  attendees: string[];
  agenda: string;
  notes?: string;
  completed: boolean;
}

interface PilotProject {
  id: string;
  targetId: string;
  startDate: Date;
  endDate?: Date;
  scope: string;
  status: "active" | "completed" | "abandoned";
  metrics: Record<string, any>;
}

// In-memory storage (replace with database in production)
const gtmDatabase = {
  targets: new Map<string, GTMTarget>(),
  demos: new Map<string, DemoCall>(),
  pilots: new Map<string, PilotProject>(),
  revenue: [] as Array<{ date: Date; amount: number; targetId: string }>,
};

/**
 * Track a new target customer
 */
async function trackTargetCustomer(
  company: string,
  contact: string,
  email: string
): Promise<GTMTarget> {
  const id = `target_${Date.now()}`;
  const target: GTMTarget = {
    id,
    company,
    contact,
    email,
    status: "prospect",
    createdAt: new Date(),
  };
  gtmDatabase.targets.set(id, target);
  return target;
}

/**
 * Schedule a demo call with a target customer
 */
async function scheduleDemoCall(
  targetId: string,
  scheduledAt: Date,
  attendees: string[],
  agenda: string
): Promise<DemoCall> {
  const target = gtmDatabase.targets.get(targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found`);
  }

  const id = `demo_${Date.now()}`;
  const demo: DemoCall = {
    id,
    targetId,
    scheduledAt,
    duration: 30,
    attendees: [...attendees, target.email],
    agenda,
    completed: false,
  };

  gtmDatabase.demos.set(id, demo);

  // Update target status
  target.status = "engaged";
  target.demoScheduled = scheduledAt;

  return demo;
}

/**
 * Manage pilot project for target customer
 */
async function manageProjectSample(
  targetId: string,
  scope: string,
  endDate: Date
): Promise<PilotProject> {
  const target = gtmDatabase.targets.get(targetId);
  if (!target) {
    throw new Error(`Target ${targetId} not found`);
  }

  const id = `pilot_${Date.now()}`;
  const pilot: PilotProject = {
    id,
    targetId,
    startDate: new Date(),
    endDate,
    scope,
    status: "active",
    metrics: {},
  };

  gtmDatabase.pilots.set(id, pilot);
  target.status = "pilot";

  return pilot;
}

/**
 * Update pilot project metrics
 */
async function updatePilotMetrics(
  pilotId: string,
  metrics: Record<string, any>
): Promise<PilotProject> {
  const pilot = gtmDatabase.pilots.get(pilotId);
  if (!pilot) {
    throw new Error(`Pilot project ${pilotId} not found`);
  }

  pilot.metrics = { ...pilot.metrics, ...metrics };
  return pilot;
}

/**
 * Complete pilot and move to customer
 */
async function completePilotProject(
  pilotId: string,
  revenueAmount: number
): Promise<{ pilot: PilotProject; revenue: GTMTarget }> {
  const pilot = gtmDatabase.pilots.get(pilotId);
  if (!pilot) {
    throw new Error(`Pilot project ${pilotId} not found`);
  }

  const target = gtmDatabase.targets.get(pilot.targetId);
  if (!target) {
    throw new Error(`Target not found for pilot ${pilotId}`);
  }

  // Update pilot status
  pilot.status = "completed";
  pilot.endDate = new Date();

  // Update target to customer
  target.status = "customer";
  target.demoScheduled = undefined;
  target.revenueExpected = revenueAmount;

  // Track revenue
  gtmDatabase.revenue.push({
    date: new Date(),
    amount: revenueAmount,
    targetId: pilot.targetId,
  });

  return { pilot, revenue: target };
}

/**
 * Generate GTM revenue report
 */
async function generateRevenueReport(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRevenue: number;
  customerCount: number;
  averageDealSize: number;
  revenueByTarget: Array<{ company: string; amount: number }>;
  monthlyTrend: Array<{ month: string; revenue: number }>;
}> {
  const filteredRevenue = gtmDatabase.revenue.filter((r) => {
    const dateInRange =
      (!startDate || r.date >= startDate) &&
      (!endDate || r.date <= endDate);
    return dateInRange;
  });

  const totalRevenue = filteredRevenue.reduce(
    (sum, r) => sum + r.amount,
    0
  );
  const customers = Array.from(gtmDatabase.targets.values()).filter(
    (t) => t.status === "customer"
  );
  const averageDealSize =
    customers.length > 0 ? totalRevenue / customers.length : 0;

  // Build revenue by target
  const revenueByTarget = filteredRevenue
    .reduce(
      (acc, r) => {
        const target = gtmDatabase.targets.get(r.targetId);
        if (target) {
          const existing = acc.find((item) => item.company === target.company);
          if (existing) {
            existing.amount += r.amount;
          } else {
            acc.push({ company: target.company, amount: r.amount });
          }
        }
        return acc;
      },
      [] as Array<{ company: string; amount: number }>
    )
    .sort((a, b) => b.amount - a.amount);

  // Build monthly trend
  const monthlyMap = new Map<string, number>();
  filteredRevenue.forEach((r) => {
    const monthKey = r.date.toISOString().slice(0, 7);
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + r.amount);
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalRevenue,
    customerCount: customers.length,
    averageDealSize,
    revenueByTarget,
    monthlyTrend,
  };
}

/**
 * Get all targets with current status
 */
async function listTargets(): Promise<GTMTarget[]> {
  return Array.from(gtmDatabase.targets.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Get target details
 */
async function getTarget(targetId: string): Promise<GTMTarget | null> {
  return gtmDatabase.targets.get(targetId) || null;
}

/**
 * MCP Tool Definitions
 */
const mcpTools: Anthropic.Tool[] = [
  {
    name: "track_target_customer",
    description:
      "Track a new target customer for GTM pipeline. Creates initial prospect entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        company: {
          type: "string",
          description: "Company name",
        },
        contact: {
          type: "string",
          description: "Contact person name",
        },
        email: {
          type: "string",
          description: "Contact email address",
        },
      },
      required: ["company", "contact", "email"],
    },
  },
  {
    name: "schedule_demo_call",
    description:
      "Schedule a demo call with a target customer. Updates target status to 'engaged'.",
    input_schema: {
      type: "object" as const,
      properties: {
        targetId: {
          type: "string",
          description: "Target customer ID",
        },
        scheduledAt: {
          type: "string",
          description: "ISO 8601 datetime for the demo",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "List of attendee names or emails",
        },
        agenda: {
          type: "string",
          description: "Demo agenda and topics",
        },
      },
      required: ["targetId", "scheduledAt", "attendees", "agenda"],
    },
  },
  {
    name: "manage_pilot_project",
    description:
      "Create and manage pilot project for target customer. Transitions customer to 'pilot' status.",
    input_schema: {
      type: "object" as const,
      properties: {
        targetId: {
          type: "string",
          description: "Target customer ID",
        },
        scope: {
          type: "string",
          description: "Pilot project scope and objectives",
        },
        endDate: {
          type: "string",
          description: "ISO 8601 date for pilot end date",
        },
      },
      required: ["targetId", "scope", "endDate"],
    },
  },
  {
    name: "update_pilot_metrics",
    description: "Update metrics and progress for active pilot project",
    input_schema: {
      type: "object" as const,
      properties: {
        pilotId: {
          type: "string",
          description: "Pilot project ID",
        },
        metrics: {
          type: "object",
          description:
            "Key-value pairs of metrics (e.g., engagement_score, completion_percentage)",
        },
      },
      required: ["pilotId", "metrics"],
    },
  },
  {
    name: "complete_pilot_project",
    description:
      "Mark pilot project as complete and record revenue. Transitions customer to 'customer' status.",
    input_schema: {
      type: "object" as const,
      properties: {
        pilotId: {
          type: "string",
          description: "Pilot project ID",
        },
        revenueAmount: {
          type: "number",
          description: "Expected annual revenue from this customer",
        },
      },
      required: ["pilotId", "revenueAmount"],
    },
  },
  {
    name: "generate_revenue_report",
    description:
      "Generate GTM revenue report with customer count, deal sizes, and trends",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: {
          type: "string",
          description: "ISO 8601 start date (optional)",
        },
        endDate: {
          type: "string",
          description: "ISO 8601 end date (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_targets",
    description: "List all target customers with their current status",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_target",
    description: "Get detailed information about a specific target customer",
    input_schema: {
      type: "object" as const,
      properties: {
        targetId: {
          type: "string",
          description: "Target customer ID",
        },
      },
      required: ["targetId"],
    },
  },
];

/**
 * Process tool calls
 */
async function processTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case "track_target_customer": {
      const result = await trackTargetCustomer(
        toolInput.company,
        toolInput.contact,
        toolInput.email
      );
      return JSON.stringify(result);
    }
    case "schedule_demo_call": {
      const result = await scheduleDemoCall(
        toolInput.targetId,
        new Date(toolInput.scheduledAt),
        toolInput.attendees,
        toolInput.agenda
      );
      return JSON.stringify(result);
    }
    case "manage_pilot_project": {
      const result = await manageProjectSample(
        toolInput.targetId,
        toolInput.scope,
        new Date(toolInput.endDate)
      );
      return JSON.stringify(result);
    }
    case "update_pilot_metrics": {
      const result = await updatePilotMetrics(
        toolInput.pilotId,
        toolInput.metrics
      );
      return JSON.stringify(result);
    }
    case "complete_pilot_project": {
      const result = await completePilotProject(
        toolInput.pilotId,
        toolInput.revenueAmount
      );
      return JSON.stringify(result);
    }
    case "generate_revenue_report": {
      const result = await generateRevenueReport(
        toolInput.startDate ? new Date(toolInput.startDate) : undefined,
        toolInput.endDate ? new Date(toolInput.endDate) : undefined
      );
      return JSON.stringify(result);
    }
    case "list_targets": {
      const result = await listTargets();
      return JSON.stringify(result);
    }
    case "get_target": {
      const result = await getTarget(toolInput.targetId);
      return result ? JSON.stringify(result) : "Target not found";
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

/**
 * Main MCP server interaction
 */
export async function runMCPServer() {
  console.log("🚀 DSG GTM Pipeline MCP Server starting...");

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        "I need to track a new target customer: Acme Corp, contact John Smith (john@acme.com). Then schedule a demo for next week and eventually manage a pilot project.",
    },
  ];

  try {
    // Step 1: Get response with tool use
    console.log(
      "\n📝 Processing user request with available tools...\n"
    );

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      tools: mcpTools,
      messages,
    });

    console.log("Response received. Processing tool calls...\n");

    // Collect all results
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    const assistantContent: Anthropic.Messages.ContentBlock[] = [];

    for (const block of response.content) {
      assistantContent.push(block);

      if (block.type === "tool_use") {
        console.log(`🔧 Tool: ${block.name}`);
        console.log(`   Input: ${JSON.stringify(block.input)}`);

        try {
          const toolResult = await processTool(
            block.name,
            block.input as Record<string, any>
          );
          console.log(`   Result: ${toolResult}\n`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: toolResult,
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.log(`   Error: ${errorMsg}\n`);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${errorMsg}`,
            is_error: true,
          });
        }
      }
    }

    // Step 2: Send tool results back
    if (toolResults.length > 0) {
      console.log("📨 Sending tool results back to Claude...\n");

      messages.push({
        role: "assistant",
        content: assistantContent,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });

      const finalResponse = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        tools: mcpTools,
        messages,
      });

      console.log("✅ Final Response:");
      for (const block of finalResponse.content) {
        if (block.type === "text") {
          console.log(block.text);
        }
      }
    }

    console.log(
      "\n✨ MCP Server completed successfully"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Export for use as module or run via node --loader
runMCPServer().catch(console.error);

export {
  trackTargetCustomer,
  scheduleDemoCall,
  manageProjectSample,
  updatePilotMetrics,
  completePilotProject,
  generateRevenueReport,
  listTargets,
  getTarget,
  mcpTools,
  processTool,
};
