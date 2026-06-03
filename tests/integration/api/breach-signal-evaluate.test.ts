import { describe, expect, it } from "vitest";

describe("/api/dsg/breach-signal/evaluate", () => {
  async function callRoute(body: unknown) {
    const { POST } = await import(
      "../../../app/api/dsg/breach-signal/evaluate/route"
    );
    return POST(
      new Request("http://localhost/api/dsg/breach-signal/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns BLOCK when rawDataIncluded is true", async () => {
    const res = await callRoute({
      owner: "example.com",
      legalPurpose: "owner_notification",
      rawDataIncluded: true,
      claimedDataTypes: ["email"],
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.type).toBe("dsg-breach-signal-evaluation");
    expect(payload.decision).toBe("BLOCK");
    expect(payload.rawDataStored).toBe(false);
    expect(payload.reasons).toContain("RAW_DATA_INCLUDED");
  });

  it("returns BLOCK when owner or legalPurpose is missing", async () => {
    const res = await callRoute({
      sourceCategory: "breach-signal",
      claimedDataTypes: ["email"],
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.decision).toBe("BLOCK");
    expect(payload.reasons).toContain("OWNER_SCOPE_REQUIRED");
    expect(payload.reasons).toContain("LEGAL_PURPOSE_REQUIRED");
    expect(payload.rawDataStored).toBe(false);
  });

  it("returns BLOCK and blocks autonomous Tor access", async () => {
    const res = await callRoute({
      owner: "example.com",
      legalPurpose: "owner_notification",
      networkRoute: "tor",
      autonomousAgentAccess: true,
      maskedSamples: ["som***@example.com"],
      claimedDataTypes: ["email"],
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.decision).toBe("BLOCK");
    expect(payload.evidenceLevel).toBe("L2");
    expect(payload.reasons).toContain("AUTONOMOUS_AGENT_ACCESS_BLOCKED");
    expect(payload.reasons).toContain("TOR_AUTONOMOUS_ACCESS_BLOCKED");
  });

  it("returns REVIEW for masked evidence without owner confirmation", async () => {
    const res = await callRoute({
      owner: "example.com",
      legalPurpose: "owner_notification",
      networkRoute: "standard",
      maskedSamples: ["som***@example.com", "sk_live_****a91f"],
      claimedDataTypes: ["email", "api_key"],
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.decision).toBe("REVIEW");
    expect(payload.evidenceLevel).toBe("L2");
    expect(payload.severity).toBe("CRITICAL");
    expect(payload.reasons).toContain("OWNER_VERIFICATION_REQUIRED");
    expect(payload.allowedActions).toContain("request_owner_verification");
    expect(payload.rawDataStored).toBe(false);
  });

  it("returns INCIDENT_REPORT_ALLOWED when ownerConfirmed is true", async () => {
    const res = await callRoute({
      owner: "example.com",
      legalPurpose: "owner_notification",
      networkRoute: "standard",
      maskedSamples: ["som***@example.com"],
      hashes: ["sha256:owner-confirmed-sample"],
      claimedDataTypes: ["hashed_password"],
      ownerConfirmed: true,
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.decision).toBe("INCIDENT_REPORT_ALLOWED");
    expect(payload.evidenceLevel).toBe("L3");
    expect(payload.severity).toBe("HIGH");
    expect(payload.allowedActions).toContain("create_owner_notification_report");
    expect(payload.rawDataStored).toBe(false);
    expect(payload.boundary.rawDataStorageEnabled).toBe(false);
    expect(payload.boundary.darkWebCrawlingEnabled).toBe(false);
  });

  it("returns 400 for empty body", async () => {
    const { POST } = await import(
      "../../../app/api/dsg/breach-signal/evaluate/route"
    );
    const res = await POST(
      new Request("http://localhost/api/dsg/breach-signal/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "",
      }),
    );
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(typeof payload.error).toBe("string");
  });

  it("returns 400 for invalid JSON body", async () => {
    const { POST } = await import(
      "../../../app/api/dsg/breach-signal/evaluate/route"
    );
    const res = await POST(
      new Request("http://localhost/api/dsg/breach-signal/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json{{{",
      }),
    );
    const payload = await res.json();

    expect(res.status).toBe(400);
    expect(payload.ok).toBe(false);
  });
});
