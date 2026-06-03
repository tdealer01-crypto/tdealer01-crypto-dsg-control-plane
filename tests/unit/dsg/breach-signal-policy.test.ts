import { describe, expect, it } from "vitest";

import { evaluateBreachSignal } from "../../../lib/dsg/breach-signal/policy";

describe("breach signal policy gate", () => {
  it("blocks when raw stolen data or full dumps are included", () => {
    const result = evaluateBreachSignal({
      owner: "example.com",
      legalPurpose: "owner_notification",
      sourceCategory: "breach-signal",
      rawDataIncluded: true,
      fullDumpIncluded: true,
      claimedDataTypes: ["email"],
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.rawDataStored).toBe(false);
    expect(result.reasons).toContain("RAW_DATA_INCLUDED");
    expect(result.reasons).toContain("FULL_DUMP_INCLUDED");
    expect(result.blockedActions).toContain("do_not_download_full_dump");
  });

  it("blocks autonomous Tor access even when the purpose looks legitimate", () => {
    const result = evaluateBreachSignal({
      owner: "example.com",
      legalPurpose: "owner_notification",
      sourceCategory: "breach-signal",
      networkRoute: "tor",
      autonomousAgentAccess: true,
      maskedSamples: ["som***@example.com"],
      claimedDataTypes: ["email"],
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.evidenceLevel).toBe("L2");
    expect(result.reasons).toContain("AUTONOMOUS_AGENT_ACCESS_BLOCKED");
    expect(result.reasons).toContain("TOR_AUTONOMOUS_ACCESS_BLOCKED");
  });

  it("allows only review for masked evidence without owner confirmation", () => {
    const result = evaluateBreachSignal({
      owner: "example.com",
      legalPurpose: "owner_notification",
      sourceCategory: "breach-signal",
      networkRoute: "standard",
      maskedSamples: ["som***@example.com", "sk_live_****a91f"],
      claimedDataTypes: ["email", "api_key"],
    });

    expect(result.decision).toBe("REVIEW");
    expect(result.evidenceLevel).toBe("L2");
    expect(result.severity).toBe("CRITICAL");
    expect(result.reasons).toContain("OWNER_VERIFICATION_REQUIRED");
    expect(result.allowedActions).toContain("request_owner_verification");
    expect(result.rawDataStored).toBe(false);
  });

  it("allows incident report only after owner confirmation or stronger evidence", () => {
    const result = evaluateBreachSignal({
      owner: "example.com",
      legalPurpose: "owner_notification",
      sourceCategory: "breach-signal",
      networkRoute: "standard",
      maskedSamples: ["som***@example.com"],
      hashes: ["sha256:owner-confirmed-sample"],
      claimedDataTypes: ["hashed_password"],
      ownerConfirmed: true,
    });

    expect(result.decision).toBe("INCIDENT_REPORT_ALLOWED");
    expect(result.evidenceLevel).toBe("L3");
    expect(result.severity).toBe("HIGH");
    expect(result.allowedActions).toContain("create_owner_notification_report");
    expect(result.rawDataStored).toBe(false);
  });

  it("blocks cases without owner scope or legal purpose", () => {
    const result = evaluateBreachSignal({
      sourceCategory: "breach-signal",
      maskedSamples: ["som***@example.com"],
      claimedDataTypes: ["email"],
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasons).toContain("OWNER_SCOPE_REQUIRED");
    expect(result.reasons).toContain("LEGAL_PURPOSE_REQUIRED");
    expect(result.rawDataStored).toBe(false);
  });
});
