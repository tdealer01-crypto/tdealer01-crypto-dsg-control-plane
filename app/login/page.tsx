import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Login
        </p>
        <h1 className="text-4xl font-bold">Access DSG Control Plane</h1>
        <p className="mt-4 text-slate-300">
          This scaffold page marks the login entrypoint for the product loop.
          The next step is wiring authentication to Supabase auth or WorkOS SSO.
        </p>

        <div className="mt-8 space-y-4">
          <button className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black">
            Continue with Email
          </button>
          <button className="w-full rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200">
            Continue with SSO
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">Implementation note</p>
          <p className="mt-2">
            Use this route as the stable URL for future auth wiring. Keep the
            page lightweight so onboarding flows can hand off here.
          </p>
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
