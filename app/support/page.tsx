import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support',
  description: 'DSG ONE online support for setup, workspace access, governance onboarding, privacy and security inquiries.',
  alternates: { canonical: '/support' },
};

const BUSINESS_EMAIL = 't.dealer01@dsg.pics';

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Support</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">DSG ONE support and contact</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          DSG ONE is supported online. Use the business contact below for setup, product, marketplace, account, privacy or security-related inquiries.
        </p>

        <div className="mt-8 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Business and support email</p>
          <a className="mt-3 block text-lg font-semibold text-sky-200 hover:text-sky-100" href={`mailto:${BUSINESS_EMAIL}`}>
            {BUSINESS_EMAIL}
          </a>
        </div>

        <div className="mt-6 grid gap-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Product support</p>
            <p className="mt-2 text-sm text-slate-300">Questions about setup, trials, workspace access or governed execution.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Security contact</p>
            <p className="mt-2 text-sm text-slate-300">Report security concerns without including secrets, credentials or private customer data in the initial message.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Privacy contact</p>
            <p className="mt-2 text-sm text-slate-300">Questions about privacy, data handling or workspace records.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Enterprise contact</p>
            <p className="mt-2 text-sm text-slate-300">Rollout planning, governance onboarding and scoped product discussions.</p>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Claim boundary</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">Support responses provide alignment and implementation guidance only. This page does not claim certification, legal attestation, or independent audit conclusions.</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">Next action: use /evidence-pack for evidence review, then contact support for scope clarification.</p>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </div>
      </section>
    </main>
  );
}
