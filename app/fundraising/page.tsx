"use client";

import Link from "next/link";
import { useState } from "react";

const narration = "DSG ONE is an AI runtime control plane. It governs high-risk AI, agent, finance, and deployment actions before they affect production systems. The live product exposes deterministic proof and gate APIs, a policy manifest, proof hashes, constraint set hashes, and replay protection evidence. The correct claim is a live deterministic proof and gate scaffold, not external Z3 production, certification, or third party audit.";

const evidence = [
  "GET /api/dsg/v1/policies/manifest returns HTTP 200",
  "POST /api/dsg/v1/gates/evaluate returns gateStatus PASS in the tested path",
  "proofHash, inputHash, constraintSetHash, policyVersion, and replayProtection are returned",
  "GitHub Marketplace Action v1.0.2 is published for CI/CD deployment gating",
];

const boundaries = [
  "No independent third-party certification claim",
  "No external Z3 solver production claim yet",
  "JWT/JWKS hardening remains a roadmap item",
  "WORM / append-only evidence storage remains a roadmap item",
  "Real Ed25519/ECDSA signing remains a roadmap item",
];

const segments = [
  "Enterprise AI governance",
  "AI compliance consulting",
  "DevSecOps and CI/CD governance",
  "Financial workflow governance",
];

export default function FundraisingPage() {
  const [speaking, setSpeaking] = useState(false);

  function playVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopVoice() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-zinc-100">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(56,120,255,0.26),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(245,196,72,0.18),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-200">
            Investor truth page
          </p>
          <h1 className="mt-7 max-w-5xl text-5xl font-black tracking-tight text-white md:text-7xl">
            DSG ONE — AI Runtime Control Plane
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300 md:text-xl">
            Deterministic governance infrastructure for AI agents, finance workflows, enterprise tools, and deployment actions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={speaking ? stopVoice : playVoice} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-zinc-950 shadow-[0_0_40px_rgba(250,204,21,0.18)]">
              {speaking ? "Stop explanation" : "Play voice explanation"}
            </button>
            <Link href="/api/dsg/v1/policies/manifest" className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white">
              Open policy manifest
            </Link>
            <Link href="/trust" className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-100">
              Trust boundary
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-12 md:grid-cols-4">
        {[["Product", "AI runtime control plane"], ["Proof", "Live deterministic gate API"], ["Evidence", "Hashes + replay protection"], ["Boundary", "No certification claim"]].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</p>
            <p className="mt-3 text-lg font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-3">
        {[
          ["Problem", "Enterprises are adding AI agents and automated workflows faster than policy, approval, and audit systems can govern them."],
          ["Solution", "DSG ONE gates high-risk actions with deterministic policy, proof, approval, and evidence checks before execution."],
          ["Moat", "The product turns AI execution into reviewable proof objects with hashes, policy versions, constraints, and replay-protection evidence."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.065] to-white/[0.025] p-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="mt-4 leading-7 text-zinc-300">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-2">
        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.06] p-6">
          <h2 className="text-2xl font-bold text-emerald-100">Production evidence</h2>
          <div className="mt-5 space-y-3">
            {evidence.map((item) => <div key={item} className="rounded-2xl border border-emerald-300/10 bg-black/25 p-4 text-sm leading-6 text-emerald-50">{item}</div>)}
          </div>
        </div>
        <div className="rounded-3xl border border-yellow-300/20 bg-yellow-400/[0.06] p-6">
          <h2 className="text-2xl font-bold text-yellow-100">Truth boundary</h2>
          <div className="mt-5 space-y-3">
            {boundaries.map((item) => <div key={item} className="rounded-2xl border border-yellow-300/10 bg-black/25 p-4 text-sm leading-6 text-yellow-50">{item}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl border border-blue-300/20 bg-blue-500/[0.06] p-6">
          <h2 className="text-2xl font-bold text-blue-100">Market entry segments</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {segments.map((segment) => <div key={segment} className="rounded-2xl border border-blue-300/10 bg-black/25 p-4 text-sm font-bold text-blue-50">{segment}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-bold text-white">Investor-safe one-liner</h2>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            DSG ONE is a live AI runtime control plane that converts policy, approval, deterministic proof, and audit evidence into enforceable runtime decisions for high-risk AI and enterprise actions.
          </p>
        </div>
      </section>
    </main>
  );
}
