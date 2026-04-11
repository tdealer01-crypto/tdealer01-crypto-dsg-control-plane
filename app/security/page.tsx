const sections = [
  {
    title: 'Access control',
    points: [
      'Org-scoped access boundaries',
      'Role-based access control',
      'Maker-checker workflow enforcement',
      'Permission-aware export access',
    ],
  },
  {
    title: 'Governance and auditability',
    points: [
      'Case-level audit timeline',
      'Policy-aware approval decisions',
      'Exception visibility and escalation tracking',
      'Exportable evidence bundles for review and audit workflows',
    ],
  },
  {
    title: 'Operational controls',
    points: [
      'Authenticated billing and admin surfaces',
      'Preview-before-production deployment flow',
      'Monitoring for auth, billing, approval, and export failures',
      'Workspace-scoped feature and entitlement handling',
    ],
  },
];

export default function SecurityPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Security overview</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Security and governance posture</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          DSG Finance Governance Control Plane is designed to help organizations govern approvals, policy routing, evidence packaging, and billing-backed workspace access without making public surfaces the system of record.
        </p>
      </div>

      <div className="mt-12 grid gap-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-semibold">{section.title}</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
              {section.points.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
