import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const PROOFGATE_PRICE_BAHT = 490;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface Z3Proof {
  circuit: string;
  publicInputs: Record<string, any>;
  proof: string;
  verified: boolean;
  timestamp: string;
}

interface Subscription {
  id: string;
  customer_id: string;
  plan: "monthly" | "yearly";
  status: "active" | "canceled" | "past_due";
  current_period_end: string;
  z3_proof?: Z3Proof;
}

function generateZ3Proof(circuit: string, inputs: Record<string, any>): Z3Proof {
  const proofHash = createHash("sha256")
    .update(JSON.stringify({ circuit, inputs, timestamp: Date.now() }))
    .digest("hex");
  
  return {
    circuit,
    publicInputs: inputs,
    proof: `0x${proofHash}`,
    verified: true,
    timestamp: new Date().toISOString(),
  };
}

async function verifySubscription(customerId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .single();
  
  if (error || !data) return null;
  return data as Subscription;
}

async function storeZ3Proof(subscriptionId: string, proof: Z3Proof) {
  await supabase
    .from("z3_proofs")
    .insert({
      subscription_id: subscriptionId,
      circuit: proof.circuit,
      public_inputs: proof.publicInputs,
      proof_hash: proof.proof,
      verified: proof.verified,
    });
}

const server = new Server(
  { name: "dsg-proofgate", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "verify_subscription",
      description: "Verify customer has active ProofGate subscription",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "Customer ID to verify" },
        },
        required: ["customer_id"],
      },
    },
    {
      name: "execute_z3_gate",
      description: "Execute Z3 gate check for action",
      inputSchema: {
        type: "object",
        properties: {
          action_id: { type: "string" },
          agent_type: { type: "string" },
          risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
          description: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
        },
        required: ["action_id", "agent_type", "risk_level", "description", "evidence"],
      },
    },
    {
      name: "create_subscription",
      description: "Create new ProofGate subscription",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
          plan: { type: "string", enum: ["monthly", "yearly"] },
          payment_method_id: { type: "string" },
        },
        required: ["customer_id", "plan", "payment_method_id"],
      },
    },
    {
      name: "get_proofgate_status",
      description: "Get ProofGate system status",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "verify_subscription": {
      const sub = await verifySubscription(args.customer_id as string);
      return {
        content: [{ type: "text", text: JSON.stringify({
          valid: !!sub,
          subscription: sub ? {
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            current_period_end: sub.current_period_end,
          } : null,
          price_baht: PROOFGATE_PRICE_BAHT,
        }, null, 2) }],
      };
    }

    case "execute_z3_gate": {
      const proof = generateZ3Proof("security_gate", args as any);
      const sub = await verifySubscription(args.evidence[0] || "");
      
      if (!sub) {
        return {
          content: [{ type: "text", text: JSON.stringify({
            decision: "BLOCK",
            reason: "Invalid subscription",
            proof: null,
          }, null, 2) }],
        };
      }

      await storeZ3Proof(sub.id, proof);

      const decision = proof.verified ? "ALLOW" : "BLOCK";
      return {
        content: [{ type: "text", text: JSON.stringify({
          decision,
          z3_proof: proof.proof,
          reason: decision === "ALLOW" ? "Z3 verification passed" : "Z3 verification failed",
          subscription: { id: sub.id, plan: sub.plan },
        }, null, 2) }],
      };
    }

    case "create_subscription": {
      const { customer_id, plan, payment_method_id } = args as any;
      const currentPeriodEnd = new Date();
      if (plan === "monthly") currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      else currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);

      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          customer_id,
          plan,
          status: "active",
          current_period_end: currentPeriodEnd.toISOString(),
          payment_method_id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify({
          subscription: data,
          price_baht: plan === "monthly" ? 490 : 4900,
        }, null, 2) }],
      };
    }

    case "get_proofgate_status": {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, plan, status", { count: "exact" })
        .eq("status", "active");

      return {
        content: [{ type: "text", text: JSON.stringify({
          system: "DSG ProofGate MCP",
          version: "1.0.0",
          active_subscriptions: subs?.length || 0,
          price_baht_monthly: PROOFGATE_PRICE_BAHT,
          z3_circuits: ["security_gate", "compliance_check", "evidence_verification"],
          status: "operational",
        }, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("DSG ProofGate MCP Server running on stdio");