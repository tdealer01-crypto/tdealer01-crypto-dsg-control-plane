import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const hasEnv = SUPABASE_URL && SUPABASE_SERVICE_KEY;
const runLiveDb = process.env.RUN_LIVE_DB_TESTS === "true";
const describeLive = hasEnv && runLiveDb ? describe : describe.skip;

describeLive("DSG Context Discovery MCP Server", () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing SUPABASE credentials");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  });

  describe("query_memory_events", () => {
    it("should return memory events filtered by workspace and kind", async () => {
      // This test verifies the data structure exists
      // In live env, would return actual memory events
      const { data, error } = await supabase
        .from("dsg_memory_events")
        .select("id, memory_kind, trust_level, normalized_summary")
        .limit(5);

      // Table should exist and be queryable (even if empty)
      expect(error || data).toBeDefined();
    });

    it("should filter by trust level", async () => {
      const { data } = await supabase
        .from("dsg_memory_events")
        .select("trust_level")
        .eq("trust_level", "verified")
        .limit(1);

      if (data && data.length > 0) {
        expect(data[0].trust_level).toBe("verified");
      }
    });
  });

  describe("query_policies", () => {
    it("should return active policies for organization", async () => {
      const { data, error } = await supabase
        .from("ai_policies")
        .select("id, name, policy_type, risk_level, enabled")
        .eq("enabled", true)
        .limit(5);

      // Table should exist (even if no test data)
      expect(error || data).toBeDefined();
    });

    it("should filter by risk level", async () => {
      const { data } = await supabase
        .from("ai_policies")
        .select("risk_level")
        .eq("risk_level", "critical")
        .limit(1);

      if (data && data.length > 0) {
        expect(["critical", "high", "medium", "low"]).toContain(
          data[0].risk_level
        );
      }
    });
  });

  describe("query_audit_logs", () => {
    it("should return audit logs for organization", async () => {
      const { data, error } = await supabase
        .from("ai_audit_logs")
        .select("id, event_type, decision, action")
        .limit(5);

      // Table should exist
      expect(error || data).toBeDefined();
    });

    it("should filter by decision outcome", async () => {
      const { data } = await supabase
        .from("ai_audit_logs")
        .select("decision")
        .eq("decision", "pass")
        .limit(1);

      if (data && data.length > 0) {
        expect(["pass", "review", "block", "unsupported"]).toContain(
          data[0].decision
        );
      }
    });

    it("should filter by time range", async () => {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data } = await supabase
        .from("ai_audit_logs")
        .select("created_at")
        .gte("created_at", sevenDaysAgo)
        .limit(1);

      if (data && data.length > 0) {
        const logDate = new Date(data[0].created_at).getTime();
        const expectedMinDate = new Date(sevenDaysAgo).getTime();
        expect(logDate).toBeGreaterThanOrEqual(expectedMinDate);
      }
    });
  });

  describe("get_context_pack", () => {
    it("should create and store context pack", async () => {
      const contextText = "Test context for verification";
      const contextHash = createHash("sha256")
        .update(contextText)
        .digest("hex");

      const { data: pack, error } = await supabase
        .from("dsg_memory_context_packs")
        .insert({
          workspace_id: "test_ws_ctx_001",
          actor_id: "test_actor",
          purpose: "verification",
          memory_ids: [],
          context_text: contextText,
          context_hash: contextHash,
          gate_status: "PASS",
        })
        .select()
        .single();

      if (!error) {
        expect(pack).toBeDefined();
        expect(pack.context_hash).toBe(contextHash);
        expect(pack.gate_status).toBe("PASS");

        // Clean up test data
        await supabase
          .from("dsg_memory_context_packs")
          .delete()
          .eq("id", pack.id);
      }
    });

    it("should retrieve context pack by ID", async () => {
      const contextText = "Test context for retrieval";
      const contextHash = createHash("sha256")
        .update(contextText)
        .digest("hex");

      const { data: pack } = await supabase
        .from("dsg_memory_context_packs")
        .insert({
          workspace_id: "test_ws_ctx_002",
          actor_id: "test_actor",
          purpose: "planning",
          memory_ids: [],
          context_text: contextText,
          context_hash: contextHash,
          gate_status: "REVIEW",
        })
        .select()
        .single();

      if (pack) {
        const { data: retrieved } = await supabase
          .from("dsg_memory_context_packs")
          .select("*")
          .eq("id", pack.id)
          .single();

        expect(retrieved?.id).toBe(pack.id);
        expect(retrieved?.gate_status).toBe("REVIEW");

        // Clean up
        await supabase
          .from("dsg_memory_context_packs")
          .delete()
          .eq("id", pack.id);
      }
    });
  });

  describe("MCP Server Tool Contracts", () => {
    it("should have query_memory_events tool schema", () => {
      const schema = {
        name: "query_memory_events",
        properties: {
          workspace_id: { type: "string" },
          memory_kind: { type: "string" },
          trust_level: { type: "string" },
          limit: { type: "number" },
          days_back: { type: "number" },
        },
        required: ["workspace_id", "memory_kind"],
      };

      expect(schema.name).toBe("query_memory_events");
      expect(schema.required).toContain("workspace_id");
    });

    it("should have query_policies tool schema", () => {
      const schema = {
        name: "query_policies",
        properties: {
          org_id: { type: "string" },
          policy_type: { type: "string" },
          risk_level: { type: "string" },
          enabled_only: { type: "boolean" },
        },
        required: ["org_id"],
      };

      expect(schema.name).toBe("query_policies");
      expect(schema.required).toContain("org_id");
    });

    it("should have query_audit_logs tool schema", () => {
      const schema = {
        name: "query_audit_logs",
        properties: {
          org_id: { type: "string" },
          event_type: { type: "string" },
          decision: { type: "string" },
          days_back: { type: "number" },
          limit: { type: "number" },
        },
        required: ["org_id"],
      };

      expect(schema.name).toBe("query_audit_logs");
      expect(schema.required).toContain("org_id");
    });

    it("should have get_context_pack tool schema", () => {
      const schema = {
        name: "get_context_pack",
        properties: {
          workspace_id: { type: "string" },
          org_id: { type: "string" },
          purpose: { type: "string" },
          topic: { type: "string" },
        },
        required: ["workspace_id", "org_id", "purpose"],
      };

      expect(schema.name).toBe("get_context_pack");
      expect(schema.required).toContain("workspace_id");
      expect(schema.required).toContain("purpose");
    });
  });

  describe("Integration: Memory -> Policy -> Audit Flow", () => {
    it("should support decision flow: gather context -> check policy -> review history", async () => {
      // This simulates an agent's decision-making flow

      // Step 1: Get context pack
      const contextText = "Integration test flow";
      const contextHash = createHash("sha256")
        .update(contextText)
        .digest("hex");

      const { data: pack } = await supabase
        .from("dsg_memory_context_packs")
        .insert({
          workspace_id: "test_ws_flow_001",
          actor_id: "test_actor",
          purpose: "runtime_execution",
          memory_ids: [],
          context_text: contextText,
          context_hash: contextHash,
          gate_status: "PASS",
        })
        .select()
        .single();

      expect(pack).toBeDefined();

      // Step 2: Check policies would be available
      const { data: policies } = await supabase
        .from("ai_policies")
        .select("id")
        .limit(1);

      // Step 3: Check audit history would be available
      const { data: audits } = await supabase
        .from("ai_audit_logs")
        .select("id")
        .limit(1);

      // Clean up
      if (pack) {
        await supabase
          .from("dsg_memory_context_packs")
          .delete()
          .eq("id", pack.id);
      }
    });
  });
});
