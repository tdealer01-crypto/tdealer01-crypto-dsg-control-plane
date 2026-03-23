"use client";

import Link from "next/link";
import { useState } from "react";

import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type LoginFormProps = {
  nextPath: string;
  initialError?: string;
};

export default function LoginForm({
  nextPath,
  initialError = "",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Magic link sent. Check your email to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Login
        </p>
        <h1 className="text-4xl font-bold">Access DSG Control Plane</h1>
        <p className="mt-4 text-slate-300">
          Sign in with your email to access the protected dashboard routes.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleEmailLogin}>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Sending..." : "Continue with Email"}
          </button>
        </form>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">Redirect after login</p>
          <p className="mt-2">Successful login returns you to {nextPath}.</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
          >
            View Pricing
          </Link>
          <Link
            href="/docs"
            className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
          >
            Read Docs
          </Link>
        </div>
      </div>
    </main>
  );
}
