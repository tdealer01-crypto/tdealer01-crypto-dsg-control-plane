import Link from "next/link";

export default function GcpMarketplacePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        background: "#020617",
        color: "#e2e8f0",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <section
          style={{
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: 28,
            padding: 28,
            background:
              "radial-gradient(circle at top right, rgba(16,185,129,0.18), transparent 30%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
            boxShadow: "0 20px 60px rgba(2,6,23,0.4)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(52,211,153,0.35)",
              background: "rgba(16,185,129,0.1)",
              color: "#86efac",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Google Cloud Marketplace
          </div>
          <h1
            style={{
              margin: "18px 0 0",
              fontSize: "clamp(40px, 7vw, 68px)",
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
              color: "#f8fafc",
            }}
          >
            DSG — Deterministic Safety Gate
          </h1>
          <p style={{ marginTop: 18, maxWidth: 760, fontSize: 18, lineHeight: 1.7, color: "#cbd5e1" }}>
            This page is the Google Cloud Marketplace entry point for DSG Control Plane.
            Use this page as the human-facing onboarding and review surface for Marketplace workflows.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 26 }}>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48,
              padding: "0 18px", borderRadius: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #10b981, #34d399)", color: "#052e16", textDecoration: "none"
            }}>
              Continue to Login
            </Link>
            <Link href="/pricing" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48,
              padding: "0 18px", borderRadius: 16, fontWeight: 700,
              border: "1px solid rgba(148,163,184,0.26)", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", textDecoration: "none"
            }}>
              View Pricing
            </Link>
            <Link href="/api/gcp/marketplace" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 48,
              padding: "0 18px", borderRadius: 16, fontWeight: 700,
              border: "1px solid rgba(148,163,184,0.26)", background: "rgba(15,23,42,0.7)", color: "#e2e8f0", textDecoration: "none"
            }}>
              Open Integration Endpoint
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 24,
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: 24,
            padding: 24,
            background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 30, color: "#f8fafc" }}>Marketplace Validation</h2>
          <ul style={{ margin: "18px 0 0", paddingLeft: 20, color: "#cbd5e1", lineHeight: 1.8, fontSize: 17 }}>
            <li>Human-facing entry page for Google Cloud Marketplace review.</li>
            <li>Stable login handoff via <code>/login</code>.</li>
            <li>Machine-facing integration route via <code>/api/gcp/marketplace</code>.</li>
            <li>Public health verification remains available at <code>/api/health</code>.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
