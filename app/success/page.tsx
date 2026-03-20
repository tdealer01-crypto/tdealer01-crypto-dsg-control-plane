export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = params.type ?? "payment";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/30 bg-slate-900 p-8">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Success
        </p>
        <h1 className="mb-4 text-4xl font-bold">Completed successfully</h1>
        <p className="text-slate-300">
          {type === "enterprise"
            ? "Your enterprise request has been received. We will contact you shortly."
            : "Your payment was completed successfully."}
        </p>
        <div className="mt-8 flex gap-4">
          <a
            href="/dashboard"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Open Dashboard
          </a>
          <a
            href="/pricing"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Back to Pricing
          </a>
        </div>
      </div>
    </main>
  );
}
