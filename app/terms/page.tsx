import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms governing DSG ONE workspace access, governed AI execution, product use and commercial plans.',
  alternates: { canonical: '/terms' },
};

const BUSINESS_EMAIL = 't.dealer01@dsg.pics';

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <h1 className="text-4xl font-bold md:text-5xl">Terms of use</h1>
      <p className="mt-4 text-lg text-slate-300">
        These terms govern organizational use of DSG workspace features, authenticated access, commercial plans, and
        operational controls.
      </p>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Service scope</h2>
        <p className="mt-4 text-slate-200">
          DSG provides public evaluation routes and workspace-scoped operational features for governed AI execution.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Workspace use</h2>
        <p className="mt-4 text-slate-200">
          Authenticated workspace features are intended for authorized organizational users operating within an active
          workspace environment.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Plans and billing</h2>
        <p className="mt-4 text-slate-200">
          Paid plans, trials, or one-time commercial offers are governed by the commercial terms attached to the
          selected offer. A public product page does not by itself create a charge or entitlement.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Operational boundaries</h2>
        <p className="mt-4 text-slate-200">
          Public product pages and public evaluation routes are not the system of record for workspace-specific evidence
          or operational review. Product evidence is bounded to the execution scope that produced it.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-4 text-slate-200">
          Questions about these terms can be sent to{' '}
          <a className="text-sky-200 hover:text-sky-100" href={`mailto:${BUSINESS_EMAIL}`}>
            {BUSINESS_EMAIL}
          </a>.
        </p>
      </section>
    </main>
  );
}
