import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact DSG ONE',
  description: 'Contact DSG ONE for online product support, enterprise planning, governance onboarding and business inquiries.',
  alternates: { canonical: '/contact' },
};

const BUSINESS_EMAIL = 't.dealer01@dsg.pics';

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Contact</p>
      <h1 className="mt-4 text-4xl font-bold md:text-5xl">DSG ONE contact</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
        DSG ONE is an online software product. Product support, enterprise planning and business inquiries are handled remotely.
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Business contact</p>
          <a className="mt-3 block text-lg font-semibold text-sky-200 hover:text-sky-100" href={`mailto:${BUSINESS_EMAIL}`}>
            {BUSINESS_EMAIL}
          </a>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Use this address for product, business, marketplace and account-related inquiries.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Website</p>
          <a className="mt-3 block text-lg font-semibold text-sky-200 hover:text-sky-100" href="https://www.dsg.pics">
            https://www.dsg.pics
          </a>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Public product information, documentation, pricing and trust surfaces are published on dsg.pics.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Enterprise and onboarding</h2>
        <p className="mt-4 text-slate-200">
          Need rollout planning, governance onboarding or a scoped product discussion? Contact DSG and include your organization context and the system you want to govern.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/support" className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950">
            Support
          </Link>
          <Link href="/pricing" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white">
            Pricing
          </Link>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400">
        <Link href="/about" className="hover:text-white">About</Link>
        <Link href="/privacy" className="hover:text-white">Privacy</Link>
        <Link href="/terms" className="hover:text-white">Terms</Link>
      </div>
    </main>
  );
}
