const steps = [
  'Create or confirm the workspace',
  'Invite finance, approver, audit, and admin roles',
  'Select invoice or payment approval template',
  'Publish the first policy version',
  'Submit the first governed item',
];

export default function FinanceGovernanceOnboardingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Onboarding</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance workflow onboarding template</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page is the skeleton for the first-run setup flow that turns a new organization into a configured finance-governance workspace.
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {steps.map((step, index) => (
          <section key={step} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/20 font-semibold text-emerald-100">
              {index + 1}
            </div>
            <p className="text-base text-slate-100">{step}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
