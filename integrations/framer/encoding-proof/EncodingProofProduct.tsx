import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Props = {
  checkoutUrl: string
  docsUrl: string
  priceLabel: string
}

const CHECKS = [
  "Linear terms valid",
  "Quadratic terms valid",
  "Dimension within bounds",
  "Coefficient magnitude bounded",
  "No NaN or Infinity",
  "No duplicate edges",
  "Variable naming consistent",
  "Encoding type matches",
]

export default function EncodingProofProduct(props: Props) {
  const {
    checkoutUrl = "https://tdealer01-crypto-dsg-control-plane.vercel.app/framer/encoding-proof/checkout",
    docsUrl = "https://tdealer01-crypto-dsg-control-plane.vercel.app/docs",
    priceLabel = "$99 / month",
  } = props

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>DSG ONE · Encoding Proof Gate</div>
        <h1 style={styles.title}>Verify the encoding before the solver runs.</h1>
        <p style={styles.subtitle}>
          Deterministic validation for QUBO and Ising encodings, with proof IDs and stable encoding hashes for audit and replay.
        </p>

        <div style={styles.actions}>
          <a href={checkoutUrl} style={styles.primaryButton}>Start Pro · {priceLabel}</a>
          <a href={docsUrl} style={styles.secondaryButton}>Technical details</a>
        </div>

        <div style={styles.truthBox}>
          <strong>Truth boundary:</strong> this product validates encoding structure and policy constraints. It does not by itself prove that the original problem was formalized semantically correctly.
        </div>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <div style={styles.cardKicker}>What you get</div>
          <h2 style={styles.cardTitle}>Deterministic proof artifacts</h2>
          <ul style={styles.list}>
            <li>proofId for every validation result</li>
            <li>encodingHash for stable replay linkage</li>
            <li>PASS / BLOCK / REVIEW outcome</li>
            <li>failure reasons when checks do not pass</li>
          </ul>
        </article>

        <article style={styles.card}>
          <div style={styles.cardKicker}>8 checks</div>
          <h2 style={styles.cardTitle}>Fail closed on invalid encodings</h2>
          <div style={styles.checkGrid}>
            {CHECKS.map((check) => (
              <div key={check} style={styles.checkItem}><span style={styles.checkMark}>✓</span>{check}</div>
            ))}
          </div>
        </article>

        <article style={styles.card}>
          <div style={styles.cardKicker}>Revenue path</div>
          <h2 style={styles.cardTitle}>One CTA into the existing DSG billing stack</h2>
          <p style={styles.cardBody}>
            Framer sends the customer to DSG ONE. Authentication, Stripe Checkout, webhook synchronization, entitlement and quota handling stay in the existing control plane rather than creating a second billing system.
          </p>
        </article>
      </section>
    </main>
  )
}

addPropertyControls(EncodingProofProduct, {
  checkoutUrl: { type: ControlType.String, title: "Checkout URL" },
  docsUrl: { type: ControlType.String, title: "Docs URL" },
  priceLabel: { type: ControlType.String, title: "Price" },
})

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    padding: "72px 24px",
    background: "radial-gradient(circle at 10% 10%, rgba(34,211,238,.15), transparent 28%), linear-gradient(180deg,#020617,#0f172a)",
    color: "#f8fafc",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  hero: { maxWidth: 980, margin: "0 auto", textAlign: "center" },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(103,232,249,.25)",
    background: "rgba(34,211,238,.08)",
    color: "#a5f3fc",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  title: { margin: "24px auto 0", maxWidth: 860, fontSize: 64, lineHeight: 1.02, letterSpacing: "-.045em" },
  subtitle: { margin: "22px auto 0", maxWidth: 760, color: "#cbd5e1", fontSize: 19, lineHeight: 1.65 },
  actions: { marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  primaryButton: {
    display: "inline-block",
    padding: "15px 22px",
    borderRadius: 14,
    background: "#22d3ee",
    color: "#083344",
    textDecoration: "none",
    fontWeight: 800,
  },
  secondaryButton: {
    display: "inline-block",
    padding: "15px 22px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.05)",
    color: "#e2e8f0",
    textDecoration: "none",
    fontWeight: 700,
  },
  truthBox: {
    margin: "28px auto 0",
    maxWidth: 760,
    padding: 16,
    borderRadius: 16,
    background: "rgba(15,23,42,.75)",
    border: "1px solid rgba(148,163,184,.18)",
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.6,
  },
  grid: {
    maxWidth: 1100,
    margin: "56px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 16,
  },
  card: {
    padding: 24,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(15,23,42,.72)",
    boxShadow: "0 20px 60px rgba(2,6,23,.35)",
  },
  cardKicker: { color: "#67e8f9", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" },
  cardTitle: { margin: "10px 0 0", fontSize: 22, lineHeight: 1.25 },
  cardBody: { margin: "14px 0 0", color: "#cbd5e1", fontSize: 14, lineHeight: 1.7 },
  list: { margin: "16px 0 0", paddingLeft: 20, color: "#cbd5e1", lineHeight: 1.8, fontSize: 14 },
  checkGrid: { marginTop: 16, display: "grid", gap: 10 },
  checkItem: { display: "flex", gap: 10, alignItems: "center", color: "#cbd5e1", fontSize: 14 },
  checkMark: { color: "#22d3ee", fontWeight: 900 },
}
