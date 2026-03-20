export default async function CancelPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = params.type ?? "payment";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-900 p-8">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-amber-400">
          Cancelled
        </p>
        <h1 className="mb-4 text-4xl font-bold">Action not completed</h1>
        <p className="text-slate-300">
          {type === "enterprise"
            ? "We could not submit your enterprise request. Please try again."
            : "Your checkout was cancelled or not completed."}
        </p>
        <div className="mt-8 flex gap-4">
          <a
            href="/pricing"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Return to Pricing
          </a>
          <a
            href="/enterprise"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
          >
            Enterprise Form
          </a>
        </div>
      </div>
    </main>
  );
}
