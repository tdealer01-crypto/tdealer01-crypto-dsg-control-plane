"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const login = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Supabase client is not configured correctly.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the login link.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Login
        </p>
        <h1 className="text-3xl font-bold">Sign in to DSG</h1>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />

          <button
            onClick={login}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black"
          >
            Send Login Link
          </button>

          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      </div>
    </main>
  );
}
