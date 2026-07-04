export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">

        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="animate-pulse rounded-lg bg-white/[0.06] h-3 w-32" />
            <div className="mt-2 animate-pulse rounded-lg bg-white/[0.08] h-8 w-48" />
          </div>
          <div className="flex gap-2">
            <div className="animate-pulse rounded-xl bg-white/[0.06] h-10 w-32" />
            <div className="animate-pulse rounded-xl bg-white/[0.06] h-10 w-24" />
          </div>
        </div>

        {/* System health skeleton */}
        <div className="mt-6 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] h-16" />

        {/* KPI cards skeleton */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:p-5"
            >
              <div className="animate-pulse rounded bg-white/[0.06] h-3 w-20" />
              <div className="mt-3 animate-pulse rounded bg-white/[0.08] h-8 w-16" />
              <div className="mt-2 animate-pulse rounded bg-white/[0.04] h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Products grid skeleton */}
        <div className="mt-8">
          <div className="mb-3 animate-pulse rounded bg-white/[0.06] h-3 w-16" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] h-28"
              />
            ))}
          </div>
        </div>

        {/* Middle row skeleton */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* Onboarding skeleton */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="animate-pulse rounded bg-white/[0.06] h-3 w-16" />
            <div className="mt-2 animate-pulse rounded bg-white/[0.08] h-6 w-32" />
            <div className="mt-3 animate-pulse rounded-full bg-white/[0.06] h-2 w-full" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse rounded-lg bg-white/[0.04] h-10 w-full" />
              ))}
            </div>
          </div>

          {/* Recent executions skeleton */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="animate-pulse rounded bg-white/[0.06] h-3 w-28" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="animate-pulse rounded-xl bg-white/[0.04] h-14 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row skeleton */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="animate-pulse rounded bg-white/[0.06] h-3 w-24" />
            <div className="mt-4 space-y-2">
              {[1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-xl bg-white/[0.04] h-16 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="animate-pulse rounded bg-white/[0.06] h-3 w-20" />
            <div className="mt-2 animate-pulse rounded bg-white/[0.08] h-6 w-36" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse rounded-xl bg-white/[0.04] h-10 w-full" />
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
