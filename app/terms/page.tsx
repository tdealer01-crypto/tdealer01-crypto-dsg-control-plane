const sections = [
  {
    title: 'Commercial use',
    text: 'DSG Finance Governance Control Plane is intended for organizational use, controlled workflow operations, policy enforcement, and audit-related export flows.',
  },
  {
    title: 'Workspace responsibility',
    text: 'Organizations are responsible for configuring roles, policies, approver assignments, and the accuracy of submitted workflow data within their workspace.',
  },
  {
    title: 'Billing and access',
    text: 'Paid product access, pilot terms, and feature entitlements should be governed by the applicable billing plan, order terms, and workspace authorization model.',
  },
  {
    title: 'Rollout note',
    text: 'This page is a product-facing trust placeholder and must be replaced or expanded with final legal terms before broad commercial release.',
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-violet-200">Terms</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Terms of service overview</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page gives the product a buyer-visible legal surface while implementation and GTM work continue. Final terms still require legal review before general availability.
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
