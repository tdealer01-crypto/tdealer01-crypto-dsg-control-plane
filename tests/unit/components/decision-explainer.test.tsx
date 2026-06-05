import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionExplainer } from "../../../components/DecisionExplainer";

function render(props: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(DecisionExplainer, props as any));
}

describe("DecisionExplainer", () => {
  it("explains a BLOCK with a fix path and surfaces the real reason", () => {
    const html = render({ decision: "BLOCK", reason: "risk above policy bound" });
    expect(html).toContain("Blocked before it could run");
    expect(html).toContain("risk above policy bound");
    // Fix actions for a block.
    expect(html).toContain("Adjust policy");
    expect(html).toContain("Open audit");
    // Decision badge echoes the raw value.
    expect(html).toContain("BLOCK");
  });

  it("explains a STABILIZE as flagged-for-review with approval path", () => {
    const html = render({ decision: "STABILIZE" });
    expect(html).toContain("Flagged for review");
    expect(html).toContain("Review approvals");
  });

  it("explains an ALLOW as passed", () => {
    const html = render({ decision: "ALLOW" });
    expect(html).toContain("Allowed");
  });

  it("renders an optional numeric risk score and policy version", () => {
    const html = render({
      decision: "STABILIZE",
      riskScore: 0.42,
      policyVersion: "v1",
    });
    expect(html).toContain("0.42");
    expect(html).toContain("v1");
  });

  it("omits the risk score row when none is provided", () => {
    const html = render({ decision: "ALLOW" });
    expect(html).not.toContain("Risk/stability score");
  });

  // Gateway vocabulary (PR #678) maps onto the same three explanations.
  it.each([
    ["pass", "Allowed"],
    ["allowed", "Allowed"],
    ["review", "Flagged for review"],
    ["needs_review", "Flagged for review"],
    ["manual_review", "Flagged for review"],
    ["deny", "Blocked before it could run"],
    ["denied", "Blocked before it could run"],
    ["blocked", "Blocked before it could run"],
  ])("maps gateway decision %s to the right explanation", (decision, headline) => {
    const html = render({ decision });
    expect(html).toContain(headline);
  });
});
