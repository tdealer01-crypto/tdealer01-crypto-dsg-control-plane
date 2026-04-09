"use client";

import Link from "next/link";

const capabilities = [
  "Deterministic policy gate with ALLOW / STABILIZE / BLOCK decisions.",
  "Audit-oriented execution records and usage tracking.",
  "Authenticated operator surfaces for dashboard, audit, billing, and policy review.",
  "Stable execution entry via /api/execute with protected runtime handling behind the current execution layer.",
];

const checks = [
  {
    title: "Product home",
    href: "/",
    desc: "Open the main public landing page for the DSG Control Plane.",
  },
  {
    title: "Login",
    href: "/login",
    desc: "Enter authenticated operator workspace routes.",
  },
  {
    title: "Health endpoint",
    href: "/api/health",
    desc: "Verify the public baseline health JSON output.",
  },
];

const steps = [
  "Open Product Home and confirm the public landing page is reachable.",
  "Open the Health endpoint and confirm the JSON baseline probe is returned.",
  "Use Login or Password Login to enter authenticated operator routes.",
  "Use the protected execute API only with valid credentials and organization-scoped access.",
];

export default function MarketplaceUiPage() {
  return (
    <main className="marketplace-shell">
      <section className="hero-card">
        <div className="badge">Marketplace Reviewer Page</div>
        <h1>DSG — Deterministic Safety Gate</h1>
        <p className="lead">
          DSG Control Plane exposes a public product surface, a public baseline health probe, and authenticated operator routes for governed AI execution. This reviewer page makes the public-versus-protected boundary explicit.
        </p>
        <div className="cta-row">
          <Link href="/" className="btn btn-primary">Open Product Home</Link>
          <Link href="/login" className="btn btn-secondary">Open Login</Link>
          <Link href="/api/health" className="btn btn-secondary">Open Health Endpoint</Link>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>Product Summary</h2>
          <p>
            DSG is designed as a control plane for governed AI execution. The public surface is reviewable without credentials, while dashboard, usage, audit, billing, policy, and execution workflows remain protected operator paths.
          </p>
          <ul className="feature-list">
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Reviewer Checks</h2>
          <div className="check-list">
            {checks.map((item) => (
              <div key={item.href} className="check-card">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                <Link href={item.href} className="text-link">Open</Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Deployment Model</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <span>Public surface</span>
            <strong>Next.js product shell + proof pages</strong>
          </div>
          <div className="stat-card">
            <span>Public probe</span>
            <strong>GET /api/health</strong>
          </div>
          <div className="stat-card">
            <span>Protected execution entry</span>
            <strong>POST /api/execute</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Review Steps</h2>
        <ol className="step-list">
          {steps.map((step, index) => (
            <li key={step}>
              <span className="step-index">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel code-panel">
        <h2>Protected Execute API</h2>
        <p>
          Execution requests use a bearer token and agent identifier. Reviewers should validate the public product surface with the landing page and health endpoint first, then use authenticated operator access for protected execution and workspace flows.
        </p>
        <pre>{`curl -X POST https://your-domain.com/api/execute \\
  -H "Authorization: Bearer DSG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agt_demo",
    "input": { "prompt": "approve invoice #123" },
    "context": { "risk_score": 0.12 }
  }'`}</pre>
      </section>

      <style jsx global>{`
        body {
          margin: 0;
          background: #020617;
          color: #e2e8f0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        * { box-sizing: border-box; }
        a { text-decoration: none; }
      `}</style>
      <style jsx>{`
        .marketplace-shell {
          min-height: 100vh;
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 72px;
        }
        .hero-card,
        .panel {
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(2, 6, 23, 0.4);
        }
        .hero-card {
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.2), transparent 30%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98));
        }
        .badge {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(52, 211, 153, 0.35);
          background: rgba(16, 185, 129, 0.1);
          color: #86efac;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        h1 {
          margin: 18px 0 0;
          font-size: clamp(42px, 8vw, 72px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: #f8fafc;
        }
        h2 {
          margin: 0 0 16px;
          font-size: 30px;
          color: #f8fafc;
        }
        h3 {
          margin: 0 0 6px;
          font-size: 18px;
          color: #f8fafc;
        }
        .lead,
        .panel p,
        .check-card p,
        .code-panel p {
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.65;
        }
        .lead {
          max-width: 840px;
          margin: 18px 0 0;
        }
        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 28px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 16px;
          font-weight: 700;
          transition: transform 160ms ease, opacity 160ms ease, border-color 160ms ease;
        }
        .btn:hover, .text-link:hover {
          transform: translateY(-1px);
          opacity: 0.96;
        }
        .btn-primary {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #052e16;
          box-shadow: 0 10px 24px rgba(16, 185, 129, 0.28);
        }
        .btn-secondary {
          border: 1px solid rgba(148, 163, 184, 0.26);
          background: rgba(15, 23, 42, 0.7);
          color: #e2e8f0;
        }
        .grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .panel {
          padding: 24px;
          margin-top: 24px;
        }
        .feature-list,
        .step-list {
          margin: 18px 0 0;
          padding: 0;
          list-style: none;
        }
        .feature-list li {
          margin-top: 12px;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.75);
          color: #e2e8f0;
          line-height: 1.55;
        }
        .check-list {
          display: grid;
          gap: 14px;
        }
        .check-card {
          display: flex;
          gap: 14px;
          justify-content: space-between;
          align-items: center;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.75);
        }
        .text-link {
          color: #34d399;
          font-weight: 700;
          white-space: nowrap;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 10px;
        }
        .stat-card {
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.75);
        }
        .stat-card span {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .stat-card strong {
          color: #f8fafc;
          font-size: 18px;
          line-height: 1.4;
        }
        .step-list li {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 12px;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.75);
          color: #e2e8f0;
          line-height: 1.55;
        }
        .step-index {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #34d399;
          color: #052e16;
          font-weight: 800;
        }
        .code-panel pre {
          margin: 16px 0 0;
          padding: 18px;
          overflow: auto;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: #020617;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @media (max-width: 900px) {
          .grid-two,
          .stat-grid {
            grid-template-columns: 1fr;
          }
          .marketplace-shell {
            padding: 18px 14px 48px;
          }
          .hero-card,
          .panel {
            border-radius: 22px;
          }
          .hero-card {
            padding: 22px 18px;
          }
          .panel {
            padding: 20px 18px;
          }
          .lead,
          .panel p,
          .check-card p,
          .code-panel p {
            font-size: 17px;
          }
          .check-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
