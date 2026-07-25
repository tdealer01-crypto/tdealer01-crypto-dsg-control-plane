#!/usr/bin/env node

/**
 * DSG GTM Execution MCP Server
 *
 * Manages customer pipeline, sales metrics, and case study data for GTM execution.
 * Provides tools for:
 * - Pipeline management (leads, demos, pilots, customers)
 * - Sales metrics tracking (weekly checkpoints, conversion rates)
 * - Case study data storage and retrieval
 * - Revenue projections and contingency tracking
 */

import Anthropic from "@anthropic-ai/sdk";
import { createServer, createTextMessage } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Tool, TextContent, ToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// DATA MODELS & STORAGE
// ============================================================================

interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  channel: "linkedin" | "email" | "community" | "inbound";
  source: string;
  painPoint: string;
  fundMovementVolume?: string;
  interestedDate: string;
  status: "new" | "contacted" | "responded" | "qualified" | "lost";
  notes: string;
}

interface DemoCall {
  id: string;
  leadId: string;
  company: string;
  contact: string;
  scheduledDate: string;
  completedDate?: string;
  score: number; // 1-10
  keyFeedback: string[];
  nextStep: "pilot" | "followup" | "disqualified" | "pending";
  pilotReady: boolean;
}

interface Pilot {
  id: string;
  company: string;
  leadId: string;
  startDate: string;
  endDate: string;
  shadow: boolean;
  review: boolean;
  enforce: boolean;
  decisionsCaptured: number;
  blockedTransactions: number;
  auditExportGenerated: boolean;
  customerFeedback: string;
  readyForPayment: boolean;
  pilotScore: number; // 1-10
}

interface Customer {
  id: string;
  company: string;
  tier: "Pro" | "Business" | "Enterprise";
  monthlyMRR: number;
  startDate: string;
  signedDate: string;
  stripeCustomerId?: string;
  invoiceEmail: string;
  decisionsCapturedThisMonth: number;
}

interface CaseStudy {
  id: string;
  company: string;
  customerId?: string;
  title: string;
  problem: string;
  solution: string;
  result: {
    auditTimeReduction: string;
    decisionsCaptured: number;
    riskPrevented: string;
    paymentsSaved?: number;
  };
  quote: {
    person: string;
    title: string;
    text: string;
  };
  published: boolean;
  publishedDate?: string;
  linkedinPost?: string;
}

interface WeeklyMetrics {
  week: number;
  startDate: string;
  endDate: string;
  leadsGenerated: number;
  conversationsStarted: number;
  demosScheduled: number;
  demosCompleted: number;
  demosConverted: number;
  pilotsLive: number;
  customersSignedThisWeek: number;
  mrrRunRate: number;
  notes: string;
}

// In-memory storage (in production, use Supabase)
const store = {
  leads: [] as Lead[],
  demoCalls: [] as DemoCall[],
  pilots: [] as Pilot[],
  customers: [] as Customer[],
  caseStudies: [] as CaseStudy[],
  weeklyMetrics: [] as WeeklyMetrics[],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveStore() {
  const dataDir = path.join(process.cwd(), ".gtm-data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "pipeline.json"), JSON.stringify(store, null, 2));
}

function loadStore() {
  const dataFile = path.join(process.cwd(), ".gtm-data", "pipeline.json");
  if (fs.existsSync(dataFile)) {
    const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    Object.assign(store, data);
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = createServer({
  name: "dsg-gtm-pipeline",
  version: "1.0.0",
});

// ============================================================================
// TOOLS: LEAD MANAGEMENT
// ============================================================================

server.setRequestHandler({
  method: "tools/list",
  handler: () => ({
    tools: [
      {
        name: "add_lead",
        description: "Add a new lead to the pipeline",
        inputSchema: {
          type: "object",
          properties: {
            company: { type: "string", description: "Company name" },
            contact: { type: "string", description: "Contact person name" },
            email: { type: "string", description: "Contact email" },
            channel: {
              type: "string",
              enum: ["linkedin", "email", "community", "inbound"],
              description: "How the lead was acquired",
            },
            source: { type: "string", description: "Specific source (e.g., Solana Discord)" },
            painPoint: { type: "string", description: "Customer's stated pain point" },
            fundMovementVolume: { type: "string", description: "Monthly fund movement volume estimate" },
          },
          required: ["company", "contact", "email", "channel", "source", "painPoint"],
        },
      },
      {
        name: "update_lead_status",
        description: "Update lead status in pipeline",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string" },
            status: {
              type: "string",
              enum: ["new", "contacted", "responded", "qualified", "lost"],
            },
            notes: { type: "string" },
          },
          required: ["leadId", "status"],
        },
      },
      {
        name: "list_leads",
        description: "List all leads with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["new", "contacted", "responded", "qualified", "lost"] },
            channel: { type: "string" },
          },
        },
      },

      // DEMO CALLS
      {
        name: "schedule_demo",
        description: "Schedule a demo call for a lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string" },
            company: { type: "string" },
            contact: { type: "string" },
            scheduledDate: { type: "string", description: "ISO 8601 date" },
          },
          required: ["leadId", "company", "contact", "scheduledDate"],
        },
      },
      {
        name: "complete_demo",
        description: "Mark demo as completed and score it",
        inputSchema: {
          type: "object",
          properties: {
            demoId: { type: "string" },
            score: { type: "number", description: "Score 1-10" },
            keyFeedback: {
              type: "array",
              items: { type: "string" },
              description: "Key feedback points",
            },
            nextStep: {
              type: "string",
              enum: ["pilot", "followup", "disqualified", "pending"],
            },
            pilotReady: { type: "boolean" },
          },
          required: ["demoId", "score", "nextStep"],
        },
      },
      {
        name: "list_demos",
        description: "List all scheduled/completed demo calls",
        inputSchema: {
          type: "object",
          properties: {
            completed: { type: "boolean" },
            minScore: { type: "number" },
          },
        },
      },

      // PILOTS
      {
        name: "launch_pilot",
        description: "Launch a pilot for a qualified lead",
        inputSchema: {
          type: "object",
          properties: {
            company: { type: "string" },
            leadId: { type: "string" },
            startDate: { type: "string", description: "ISO 8601 date" },
            endDate: { type: "string", description: "ISO 8601 date" },
            initialMode: {
              type: "string",
              enum: ["shadow", "review", "enforce"],
              description: "Starting mode",
            },
          },
          required: ["company", "leadId", "startDate"],
        },
      },
      {
        name: "update_pilot",
        description: "Update pilot metrics and progress",
        inputSchema: {
          type: "object",
          properties: {
            pilotId: { type: "string" },
            decisionsCaptured: { type: "number" },
            blockedTransactions: { type: "number" },
            auditExportGenerated: { type: "boolean" },
            customerFeedback: { type: "string" },
            readyForPayment: { type: "boolean" },
            pilotScore: { type: "number", description: "1-10" },
          },
          required: ["pilotId"],
        },
      },
      {
        name: "list_pilots",
        description: "List all pilots",
        inputSchema: {
          type: "object",
          properties: {
            active: { type: "boolean" },
            readyForPayment: { type: "boolean" },
          },
        },
      },

      // CUSTOMERS
      {
        name: "convert_to_customer",
        description: "Convert pilot to paying customer",
        inputSchema: {
          type: "object",
          properties: {
            pilotId: { type: "string" },
            company: { type: "string" },
            tier: { type: "string", enum: ["Pro", "Business", "Enterprise"] },
            monthlyMRR: { type: "number" },
            invoiceEmail: { type: "string" },
          },
          required: ["pilotId", "company", "tier", "monthlyMRR", "invoiceEmail"],
        },
      },
      {
        name: "list_customers",
        description: "List all paying customers",
        inputSchema: {
          type: "object",
          properties: {
            tier: { type: "string", enum: ["Pro", "Business", "Enterprise"] },
          },
        },
      },
      {
        name: "get_mrr_summary",
        description: "Get current MRR and customer breakdown",
        inputSchema: { type: "object", properties: {} },
      },

      // CASE STUDIES
      {
        name: "create_case_study",
        description: "Create a new case study from a customer",
        inputSchema: {
          type: "object",
          properties: {
            customerId: { type: "string" },
            company: { type: "string" },
            title: { type: "string" },
            problem: { type: "string" },
            solution: { type: "string" },
            auditTimeReduction: { type: "string", description: "e.g., '10 hours to 1.5 hours'" },
            decisionsCaptured: { type: "number" },
            riskPrevented: { type: "string" },
            quotePerson: { type: "string" },
            quoteTitle: { type: "string" },
            quoteText: { type: "string" },
          },
          required: ["company", "title", "problem", "solution", "quotePerson", "quoteText"],
        },
      },
      {
        name: "publish_case_study",
        description: "Mark case study as published",
        inputSchema: {
          type: "object",
          properties: {
            caseStudyId: { type: "string" },
            linkedinPost: { type: "string", description: "LinkedIn URL if posted" },
          },
          required: ["caseStudyId"],
        },
      },
      {
        name: "list_case_studies",
        description: "List all case studies",
        inputSchema: {
          type: "object",
          properties: {
            published: { type: "boolean" },
          },
        },
      },

      // WEEKLY METRICS
      {
        name: "log_weekly_metrics",
        description: "Log metrics for a week",
        inputSchema: {
          type: "object",
          properties: {
            week: { type: "number" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            leadsGenerated: { type: "number" },
            conversationsStarted: { type: "number" },
            demosScheduled: { type: "number" },
            demosCompleted: { type: "number" },
            demosConverted: { type: "number" },
            pilotsLive: { type: "number" },
            customersSignedThisWeek: { type: "number" },
            mrrRunRate: { type: "number" },
            notes: { type: "string" },
          },
          required: ["week", "startDate", "endDate"],
        },
      },
      {
        name: "get_weekly_summary",
        description: "Get summary of all weekly metrics",
        inputSchema: {
          type: "object",
          properties: {
            lastNWeeks: { type: "number", description: "Last N weeks" },
          },
        },
      },

      // CONTINGENCY TRACKING
      {
        name: "check_contingency_triggers",
        description: "Check if any contingency triggers are activated",
        inputSchema: {
          type: "object",
          properties: {
            week: { type: "number" },
          },
          required: ["week"],
        },
      },
    ] as Tool[],
  }),
});

// Request handler for all tools
server.setRequestHandler({
  method: "tools/call",
  handler: async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: object | string;

      switch (name) {
        // LEADS
        case "add_lead": {
          const lead: Lead = {
            id: generateId(),
            company: args.company,
            contact: args.contact,
            email: args.email,
            channel: args.channel,
            source: args.source,
            painPoint: args.painPoint,
            fundMovementVolume: args.fundMovementVolume,
            interestedDate: new Date().toISOString(),
            status: "new",
            notes: "",
          };
          store.leads.push(lead);
          saveStore();
          result = { success: true, leadId: lead.id, lead };
          break;
        }

        case "update_lead_status": {
          const lead = store.leads.find((l) => l.id === args.leadId);
          if (!lead) throw new Error("Lead not found");
          lead.status = args.status;
          lead.notes = args.notes || lead.notes;
          saveStore();
          result = { success: true, lead };
          break;
        }

        case "list_leads": {
          let leads = store.leads;
          if (args.status) leads = leads.filter((l) => l.status === args.status);
          if (args.channel) leads = leads.filter((l) => l.channel === args.channel);
          result = {
            count: leads.length,
            leads: leads.map((l) => ({ ...l })),
          };
          break;
        }

        // DEMOS
        case "schedule_demo": {
          const demo: DemoCall = {
            id: generateId(),
            leadId: args.leadId,
            company: args.company,
            contact: args.contact,
            scheduledDate: args.scheduledDate,
            score: 0,
            keyFeedback: [],
            nextStep: "pending",
            pilotReady: false,
          };
          store.demoCalls.push(demo);
          saveStore();
          result = { success: true, demoId: demo.id };
          break;
        }

        case "complete_demo": {
          const demo = store.demoCalls.find((d) => d.id === args.demoId);
          if (!demo) throw new Error("Demo not found");
          demo.completedDate = new Date().toISOString();
          demo.score = args.score;
          demo.keyFeedback = args.keyFeedback || [];
          demo.nextStep = args.nextStep;
          demo.pilotReady = args.pilotReady || false;
          saveStore();
          result = { success: true, demo };
          break;
        }

        case "list_demos": {
          let demos = store.demoCalls;
          if (args.completed !== undefined) {
            demos = demos.filter((d) => (d.completedDate ? true : false) === args.completed);
          }
          if (args.minScore) demos = demos.filter((d) => d.score >= args.minScore);
          result = { count: demos.length, demos };
          break;
        }

        // PILOTS
        case "launch_pilot": {
          const pilot: Pilot = {
            id: generateId(),
            company: args.company,
            leadId: args.leadId,
            startDate: args.startDate,
            endDate: args.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            shadow: args.initialMode === "shadow" || args.initialMode === "review",
            review: args.initialMode === "review" || args.initialMode === "enforce",
            enforce: args.initialMode === "enforce",
            decisionsCaptured: 0,
            blockedTransactions: 0,
            auditExportGenerated: false,
            customerFeedback: "",
            readyForPayment: false,
            pilotScore: 0,
          };
          store.pilots.push(pilot);
          saveStore();
          result = { success: true, pilotId: pilot.id };
          break;
        }

        case "update_pilot": {
          const pilot = store.pilots.find((p) => p.id === args.pilotId);
          if (!pilot) throw new Error("Pilot not found");
          if (args.decisionsCaptured !== undefined) pilot.decisionsCaptured = args.decisionsCaptured;
          if (args.blockedTransactions !== undefined) pilot.blockedTransactions = args.blockedTransactions;
          if (args.auditExportGenerated !== undefined) pilot.auditExportGenerated = args.auditExportGenerated;
          if (args.customerFeedback !== undefined) pilot.customerFeedback = args.customerFeedback;
          if (args.readyForPayment !== undefined) pilot.readyForPayment = args.readyForPayment;
          if (args.pilotScore !== undefined) pilot.pilotScore = args.pilotScore;
          saveStore();
          result = { success: true, pilot };
          break;
        }

        case "list_pilots": {
          let pilots = store.pilots;
          if (args.active !== undefined) {
            const now = new Date();
            pilots = pilots.filter((p) => {
              const end = new Date(p.endDate);
              return (end > now) === args.active;
            });
          }
          if (args.readyForPayment !== undefined) {
            pilots = pilots.filter((p) => p.readyForPayment === args.readyForPayment);
          }
          result = { count: pilots.length, pilots };
          break;
        }

        // CUSTOMERS
        case "convert_to_customer": {
          const pilot = store.pilots.find((p) => p.id === args.pilotId);
          if (!pilot) throw new Error("Pilot not found");

          const customer: Customer = {
            id: generateId(),
            company: args.company,
            tier: args.tier,
            monthlyMRR: args.monthlyMRR,
            startDate: new Date().toISOString(),
            signedDate: new Date().toISOString(),
            invoiceEmail: args.invoiceEmail,
            decisionsCapturedThisMonth: pilot.decisionsCaptured,
          };
          store.customers.push(customer);
          pilot.readyForPayment = false; // Mark pilot as converted
          saveStore();
          result = { success: true, customerId: customer.id };
          break;
        }

        case "list_customers": {
          let customers = store.customers;
          if (args.tier) customers = customers.filter((c) => c.tier === args.tier);
          result = { count: customers.length, customers };
          break;
        }

        case "get_mrr_summary": {
          const totalMRR = store.customers.reduce((sum, c) => sum + c.monthlyMRR, 0);
          const byTier = {
            Pro: store.customers.filter((c) => c.tier === "Pro").reduce((sum, c) => sum + c.monthlyMRR, 0),
            Business: store.customers.filter((c) => c.tier === "Business").reduce((sum, c) => sum + c.monthlyMRR, 0),
            Enterprise: store.customers
              .filter((c) => c.tier === "Enterprise")
              .reduce((sum, c) => sum + c.monthlyMRR, 0),
          };
          result = { totalMRR, byTier, customerCount: store.customers.length };
          break;
        }

        // CASE STUDIES
        case "create_case_study": {
          const cs: CaseStudy = {
            id: generateId(),
            company: args.company,
            customerId: args.customerId,
            title: args.title,
            problem: args.problem,
            solution: args.solution,
            result: {
              auditTimeReduction: args.auditTimeReduction,
              decisionsCaptured: args.decisionsCaptured,
              riskPrevented: args.riskPrevented,
              paymentsSaved: args.paymentsSaved,
            },
            quote: {
              person: args.quotePerson,
              title: args.quoteTitle,
              text: args.quoteText,
            },
            published: false,
          };
          store.caseStudies.push(cs);
          saveStore();
          result = { success: true, caseStudyId: cs.id };
          break;
        }

        case "publish_case_study": {
          const cs = store.caseStudies.find((c) => c.id === args.caseStudyId);
          if (!cs) throw new Error("Case study not found");
          cs.published = true;
          cs.publishedDate = new Date().toISOString();
          cs.linkedinPost = args.linkedinPost;
          saveStore();
          result = { success: true, caseStudy: cs };
          break;
        }

        case "list_case_studies": {
          let cs = store.caseStudies;
          if (args.published !== undefined) cs = cs.filter((c) => c.published === args.published);
          result = { count: cs.length, caseStudies: cs };
          break;
        }

        // WEEKLY METRICS
        case "log_weekly_metrics": {
          const metrics: WeeklyMetrics = {
            week: args.week,
            startDate: args.startDate,
            endDate: args.endDate,
            leadsGenerated: args.leadsGenerated || 0,
            conversationsStarted: args.conversationsStarted || 0,
            demosScheduled: args.demosScheduled || 0,
            demosCompleted: args.demosCompleted || 0,
            demosConverted: args.demosConverted || 0,
            pilotsLive: args.pilotsLive || 0,
            customersSignedThisWeek: args.customersSignedThisWeek || 0,
            mrrRunRate: args.mrrRunRate || 0,
            notes: args.notes || "",
          };
          store.weeklyMetrics.push(metrics);
          saveStore();
          result = { success: true, metricsId: args.week };
          break;
        }

        case "get_weekly_summary": {
          let weeks = store.weeklyMetrics.sort((a, b) => b.week - a.week);
          if (args.lastNWeeks) weeks = weeks.slice(0, args.lastNWeeks);
          result = { weeks };
          break;
        }

        case "check_contingency_triggers": {
          const week = args.week;
          const triggers: { [key: string]: boolean | string } = {};

          // Week 1: Outreach < 10 conversations
          if (week === 1) {
            const w1 = store.weeklyMetrics.find((m) => m.week === 1);
            triggers["week1_outreach_low"] = !w1 || w1.conversationsStarted < 10;
          }

          // Week 2: Demos < 3 pilots
          if (week === 2) {
            const w2 = store.weeklyMetrics.find((m) => m.week === 2);
            triggers["week2_demos_low"] = !w2 || w2.demosConverted < 3;
          }

          // Week 3: Pilots < 50 decisions
          if (week === 3) {
            const pilots = store.pilots.filter((p) => {
              const start = new Date(p.startDate);
              const end = new Date(p.endDate);
              return start <= new Date() && new Date() <= end;
            });
            const totalDecisions = pilots.reduce((sum, p) => sum + p.decisionsCaptured, 0);
            triggers["week3_pilots_low"] = totalDecisions < 50;
          }

          // Week 4: Customers < 1 signed
          if (week === 4) {
            const w4 = store.weeklyMetrics.find((m) => m.week === 4);
            triggers["week4_customers_low"] = !w4 || w4.customersSignedThisWeek < 1;
          }

          result = { week, triggers, activeTriggers: Object.values(triggers).filter((t) => t).length };
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [createTextMessage(JSON.stringify(result, null, 2))],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [createTextMessage(`Error: ${errorMessage}`)],
        isError: true,
      };
    }
  },
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  loadStore();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("DSG GTM Pipeline MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
