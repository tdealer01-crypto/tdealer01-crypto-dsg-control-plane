export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Enterprise
        </p>
        <h1 className="mb-6 text-4xl font-bold">Request an Enterprise Quote</h1>
        <p className="mb-8 text-slate-300">
          สำหรับองค์กรที่ต้องการ SSO, audit exports, policy approvals, onboarding,
          และ DSG governance runtime แบบกำหนดเอง
        </p>

        <form action="/api/enterprise/quote" method="POST" className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Full name</label>
            <input
              name="name"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Work email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Company</label>
            <input
              name="company"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Use case</label>
            <textarea
              name="use_case"
              rows={5}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white"
              placeholder="Describe your governance, audit, security, or agent execution requirements"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Request Quote
          </button>
        </form>
      </div>
    </main>
  );
}
