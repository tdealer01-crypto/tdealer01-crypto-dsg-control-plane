"use client";

import { useState } from "react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST"
      });

      const raw = await res.text();
      let data: any = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Checkout API returned non-JSON response (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Checkout failed (${res.status})`);
      }

      if (!data?.url) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold">DSG Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Billing</p>
            <p className="mt-2 text-xl font-semibold">Stripe Ready</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Database</p>
            <p className="mt-2 text-xl font-semibold">Supabase Ready</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-xl font-semibold">Resend Ready</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Checkout</h2>
          <p className="mt-2 text-slate-300">
            กดปุ่มด้านล่างเพื่อเปิด Stripe Checkout
          </p>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-5 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Opening Checkout..." : "Buy / Checkout"}
          </button>

          {error ? (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
