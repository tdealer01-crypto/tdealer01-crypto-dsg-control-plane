import { describe, expect, it } from "vitest";
import {
  MIDMARKET_AUTOPILOT_EXAMPLE,
  evaluateMidMarketGovernanceAutopilot,
} from "../../lib/dsg/midmarket-governance-autopilot";

const fixedNow = new Date("2026-05-06T00:00:00.000Z");

describe("mid-market governance autopilot", () => {
  it("produces deterministic decision hashes for the same request and timestamp", () => {
    const first = evaluateMidMarketGovernanceAutopilot(MIDMARKET_AUTOPILOT_EXAMPLE, fixedNow);
    const second = evaluateMidMarketGovernanceAutopilot(MIDMARKET_AUTOPILOT_EXAMPLE, fixedNow);

    expect(first.requestHash).toBe(second.requestHash);
    expect(first.decisionHash).toBe(second.decisionHash);
    expect(first.decision).toBe("REVIEW");
  });

  it("blocks direct database mutations", () => {
    const result = evaluateMidMarketGovernanceAutopilot(
      {
        automationPreference: "gated",
        systems: [
          {
            systemId: "finance-db",
            name: "Finance Database",
            category: "finance",
            integrationType: "database",
            environment: "production",
            dataClasses: ["restricted", "payment"],
            businessCriticality: "critical",
            ownerTeam: "Finance",
            hasAuditLog: true,
            hasApprovalFlow: true,
            hasRollbackPath: false,
            operations: [{ name: "write ledger row", method: "POST", mutation: true, payment: true }],
          },
        ],
      },
      fixedNow,
    );

    expect(result.decision).toBe("BLOCK");
    expect(result.invariantResults.find((item) => item.name === "no_direct_database_mutation")?.status).toBe("BLOCK");
  });

  it("passes a low-risk read-only API inventory", () => {
    const result = evaluateMidMarketGovernanceAutopilot(
      {
        automationPreference: "shadow",
        systems: [
          {
            systemId: "support-kb",
            name: "Support Knowledge Base",
            category: "support",
            integrationType: "api",
            environment: "staging",
            dataClasses: ["internal"],
            businessCriticality: "low",
            ownerTeam: "Support Ops",
            hasAuditLog: true,
            hasApprovalFlow: false,
            hasRollbackPath: true,
            operations: [{ name: "read article", method: "GET", expectedVolumePerDay: 100 }],
          },
        ],
      },
      fixedNow,
    );

    expect(result.decision).toBe("PASS");
    expect(result.readyForCustomerPilot).toBe(true);
  });
});
