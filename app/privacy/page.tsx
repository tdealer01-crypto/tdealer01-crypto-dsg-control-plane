const sections = [
  {
    title: 'What this page covers',
    text: 'This page summarizes how DSG Control Plane handles product data, workspace scope, execution records, and exportable evidence.',
  },
  {
    title: 'Product data scope',
    text: 'Organizations use DSG to manage governed execution workflows, policy context, exceptions, audit records, and evidence exports. Customer systems remain the source of record for underlying business data.',
  },
  {
    title: 'Workspace scoping',
    text: 'Product actions, approvals, exports, and billing-backed entitlements should remain scoped to the authenticated organization workspace.',
  },
  {
    title: 'Operational note',
    text: 'This is a product privacy overview for buyers and operators. Binding legal terms are defined in customer agreements, including the applicable MSA/DPA.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Privacy</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Privacy overview</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page provides a clear buyer-facing privacy summary for DSG ONE Control Plane and how data boundaries are enforced across public and authenticated surfaces.
        </p>
      </div>

      <div className="mt-12 grid gap-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-semibold">{section.title}</h2>
            <p className="mt-4 leading-7 text-slate-200">{section.text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
