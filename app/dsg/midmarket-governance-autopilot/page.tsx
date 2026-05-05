"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const exampleRequest = {
  workspaceId: "demo-midmarket-workspace",
  customerName: "MidMarket Finance Ops",
  industry: "financial operations",
  companySize: "mid-market",
  automationPreference: "gated",
  currentPainPoints: [
    "manual approval screenshots",
    "slow audit evidence collection",
    "AI/workflow tools can call APIs without one runtime control view",
  ],
  systems: [
    {
      systemId: "crm-hubspot",
      name: "Customer CRM",
      category: "crm",
      integrationType: "api",
      environment: "production",
      dataClasses: ["internal", "pii"],
      businessCriticality: "medium",
      ownerTeam: "Revenue Ops",
      hasAuditLog: true,
      hasApprovalFlow: false,
      hasRollbackPath: true,
      operations: [
        { name: "read customer profile", method: "GET", pii: true, expectedVolumePerDay: 250 },
        { name: "update lifecycle stage", method: "PATCH", mutation: true, pii: true, expectedVolumePerDay: 80 },
      ],
    },
    {
      systemId: "stripe-billing",
      name: "Billing and Payment Gateway",
      category: "payments",
      integrationType: "api",
      environment: "production",
      dataClasses: ["restricted", "payment"],
      businessCriticality: "critical",
      ownerTeam: "Finance",
      hasAuditLog: true,
      hasApprovalFlow: true,
      hasRollbackPath: true,
      operations: [
        { name: "create invoice", method: "POST", mutation: true, payment: true, expectedVolumePerDay: 40 },
        { name: "issue refund", method: "POST", mutation: true, payment: true, requiresHumanApproval: true, expectedVolumePerDay: 4 },
      ],
    },
  ],
};

type AutopilotResult = {
  decision: "PASS" | "REVIEW" | "BLOCK";
  overallRisk: string;
  riskScore: number;
  readyForCustomerPilot: boolean;
  recommendedPackage: string;
  valueScore: number;
  estimatedTimeToFirstValueDays: number;
  estimatedGovernedActionsPerMonth: number;
  reasons: string[];
  invariantResults: { name: string; status: string; reason: string; evidenceRequired: string[] }[];
  operationRisks: { systemName: string; operationName: string; riskLevel: string; riskScore: number; reasons: string[] }[];
  rolloutPlan: { wave: number; name: string; goal: string; durationDays: number; exitCriteria: string[]; systems: string[] }[];
  runtimeMonitor: { title: string; metric: string; threshold: string; action: string }[];
  connectionGuide: string[];
  evidenceRequired: string[];
  requestHash: string;
  decisionHash: string;
};

export default function MidMarketGovernanceAutopilotPage() {
  const [payload, setPayload] = useState(JSON.stringify(exampleRequest, null, 2));
  const [result, setResult] = useState<AutopilotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tone = useMemo(() => {
    if (!result) return "ready";
    return result.decision.toLowerCase();
  }, [result]);

  async function runAssessment() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dsg/midmarket-governance-autopilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(JSON.parse(payload)),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "Evaluation failed");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid customer system inventory JSON");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>DSG Mid-Market Governance Autopilot</div>
          <h1 style={styles.title}>Govern existing customer systems before AI or workflow actions touch production.</h1>
          <p style={styles.subtitle}>
            One practical operator flow for mid-market customers: connect current CRM, ERP, finance, support, and payment systems;
            classify risk; enforce invariants; generate audit evidence; and monitor runtime actions without forcing a stack rebuild.
          </p>
        </div>
        <div style={{ ...styles.statusCard, ...toneStyle(tone) }}>
          <span style={styles.statusLabel}>Customer pilot gate</span>
          <strong style={styles.statusValue}>{result?.decision || "READY"}</strong>
          <span style={styles.statusHint}>{result ? `Risk ${result.overallRisk} / Score ${result.riskScore}` : "Run intake to evaluate value and risk"}</span>
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Customer system intake JSON</h2>
            <button style={styles.secondaryButton} onClick={() => setPayload(JSON.stringify(exampleRequest, null, 2))}>Load example</button>
          </div>
          <textarea value={payload} onChange={(event) => setPayload(event.target.value)} style={styles.textarea} spellCheck={false} />
          <button style={styles.primaryButton} onClick={runAssessment} disabled={loading}>{loading ? "Evaluating..." : "Run governance autopilot"}</button>
          {error ? <div style={styles.errorBox}>{error}</div> : null}
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Value summary</h2>
          {result ? (
            <div style={styles.metricGrid}>
              <Metric label="Value score" value={`${result.valueScore}/100`} />
              <Metric label="Time to first value" value={`${result.estimatedTimeToFirstValueDays} days`} />
              <Metric label="Governed actions/month" value={result.estimatedGovernedActionsPerMonth.toLocaleString()} />
              <Metric label="Package" value={result.recommendedPackage.toUpperCase()} />
            </div>
          ) : <Empty text="Run assessment to see pilot readiness, rollout waves, runtime monitors, and evidence requirements." />}
        </div>
      </section>

      {result ? (
        <>
          <section style={styles.cards3}>
            <Panel title="Invariant gate" items={result.invariantResults.map((item) => `${item.status} · ${item.name} — ${item.reason}`)} />
            <Panel title="Connection guide" items={result.connectionGuide} />
            <Panel title="Evidence required" items={result.evidenceRequired} />
          </section>

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Runtime monitor UI</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th>Monitor</th><th>Metric</th><th>Threshold</th><th>Action</th></tr></thead>
                <tbody>{result.runtimeMonitor.map((monitor) => <tr key={monitor.title}><td>{monitor.title}</td><td>{monitor.metric}</td><td>{monitor.threshold}</td><td>{monitor.action.toUpperCase()}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section style={styles.grid}>
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>Operation risk map</h2>
              <div style={styles.stack}>{result.operationRisks.map((risk) => <div key={`${risk.systemName}-${risk.operationName}`} style={styles.riskRow}><div><strong>{risk.systemName}</strong><div style={styles.muted}>{risk.operationName}</div></div><Badge text={`${risk.riskLevel} ${risk.riskScore}`} /></div>)}</div>
            </div>
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>Rollout waves</h2>
              <div style={styles.stack}>{result.rolloutPlan.map((wave) => <div key={wave.wave} style={styles.waveCard}><strong>Wave {wave.wave}: {wave.name}</strong><p style={styles.muted}>{wave.goal}</p><span style={styles.small}>Exit: {wave.exitCriteria.join(" · ")}</span></div>)}</div>
            </div>
          </section>

          <section style={styles.proofBox}><span>Request hash: {result.requestHash}</span><span>Decision hash: {result.decisionHash}</span></section>
        </>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metricCard}><span style={styles.muted}>{label}</span><strong style={styles.metricValue}>{value}</strong></div>;
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return <div style={styles.panel}><h2 style={styles.panelTitle}>{title}</h2><ul style={styles.list}>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function Badge({ text }: { text: string }) {
  return <span style={styles.badge}>{text}</span>;
}

function Empty({ text }: { text: string }) {
  return <div style={styles.empty}>{text}</div>;
}

function toneStyle(tone: string) {
  if (tone === "pass") return { borderColor: "#22c55e", background: "rgba(34,197,94,0.12)" };
  if (tone === "review") return { borderColor: "#f59e0b", background: "rgba(245,158,11,0.12)" };
  if (tone === "block") return { borderColor: "#ef4444", background: "rgba(239,68,68,0.12)" };
  return { borderColor: "rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.7)" };
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 28, maxWidth: 1440, margin: "0 auto", color: "#e5e7eb" },
  hero: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 24, alignItems: "stretch", marginBottom: 24 },
  eyebrow: { color: "#38bdf8", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700 },
  title: { fontSize: 42, lineHeight: 1.05, margin: "10px 0", maxWidth: 980 },
  subtitle: { color: "#94a3b8", fontSize: 16, lineHeight: 1.7, maxWidth: 960 },
  statusCard: { border: "1px solid", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" },
  statusLabel: { color: "#94a3b8", fontSize: 13 },
  statusValue: { fontSize: 44, marginTop: 8 },
  statusHint: { color: "#cbd5e1", fontSize: 13, marginTop: 10 },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 20, marginBottom: 20 },
  cards3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, marginBottom: 20 },
  panel: { border: "1px solid rgba(148,163,184,0.22)", borderRadius: 20, background: "rgba(15,23,42,0.76)", padding: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  panelTitle: { fontSize: 18, margin: "0 0 14px" },
  textarea: { width: "100%", height: 520, borderRadius: 14, border: "1px solid rgba(148,163,184,0.28)", background: "#020617", color: "#dbeafe", padding: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, lineHeight: 1.55, resize: "vertical" },
  primaryButton: { width: "100%", marginTop: 14, border: 0, borderRadius: 14, padding: "14px 18px", color: "#020617", background: "#38bdf8", fontWeight: 800, cursor: "pointer" },
  secondaryButton: { border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#cbd5e1", borderRadius: 999, padding: "8px 12px", cursor: "pointer" },
  errorBox: { marginTop: 12, color: "#fecaca", background: "rgba(239,68,68,0.14)", padding: 12, borderRadius: 12 },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 },
  metricCard: { border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16, padding: 16, background: "rgba(30,41,59,0.58)" },
  metricValue: { display: "block", fontSize: 28, marginTop: 8 },
  muted: { color: "#94a3b8", fontSize: 13, lineHeight: 1.55 },
  small: { color: "#cbd5e1", fontSize: 12 },
  list: { margin: 0, paddingLeft: 18, color: "#cbd5e1", lineHeight: 1.7, fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", color: "#cbd5e1" },
  stack: { display: "flex", flexDirection: "column", gap: 12 },
  riskRow: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14, padding: 14, background: "rgba(30,41,59,0.5)" },
  waveCard: { border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14, padding: 14, background: "rgba(30,41,59,0.5)" },
  badge: { borderRadius: 999, padding: "6px 10px", background: "rgba(56,189,248,0.12)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.25)", fontSize: 12, fontWeight: 800, textTransform: "uppercase" },
  proofBox: { display: "flex", flexDirection: "column", gap: 6, color: "#94a3b8", fontSize: 12, border: "1px dashed rgba(148,163,184,0.3)", borderRadius: 16, padding: 14, marginBottom: 30, wordBreak: "break-all" },
  empty: { border: "1px dashed rgba(148,163,184,0.28)", borderRadius: 16, padding: 24, color: "#94a3b8", lineHeight: 1.6 },
};
