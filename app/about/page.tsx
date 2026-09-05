import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About DSG ONE',
  description:
    'DSG ONE is an online software product for governed AI-agent execution, MCP integrations, policy gates, evidence, replay and audit.',
  alternates: { canonical: '/about' },
};

const facts = [
  ['Product', 'DSG ONE'],
  ['Runtime / commercial name', 'DSG Spacetime'],
  ['Website', 'https://www.dsg.pics'],
  ['Operating model', 'Online software and remote support'],
  ['Location', 'Thailand'],
  ['Business contact', 't.dealer01@dsg.pics'],
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-sky-200">About</p>
      <h1 className="mt-4 text-4xl font-bold md:text-5xl">DSG ONE</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
        DSG ONE is an online software product focused on governed AI-agent execution. It is designed to sit between
        agents and real systems so plans, permissions, policy decisions, execution evidence and audit boundaries stay
        explicit.
      </p>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Public product identity</h2>
        <dl className="mt-5 divide-y divide-white/10">
          {facts.map(([label, value]) => (
            <div key={label} className="grid gap-2 py-4 sm:grid-cols-[220px_1fr]">
              <dt className="text-sm font-semibold text-slate-400">{label}</dt>
              <dd className="text-sm text-slate-100">
                {label === 'Website' ? (
                  <a className="text-sky-200 hover:text-sky-100" href={value}>{value}</a>
                ) : label === 'Business contact' ? (
                  <a className="text-sky-200 hover:text-sky-100" href={`mailto:${value}`}>{value}</a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">What DSG provides</h2>
        <ul className="mt-4 space-y-3 text-slate-200">
          <li>• AI-agent execution governance and policy gates</li>
          <li>• MCP and API integration controls</li>
          <li>• Explicit approval and permission boundaries</li>
          <li>• Evidence, audit and replay surfaces</li>
          <li>• Installation and runtime verification boundaries</li>
        </ul>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-300/5 p-7">
        <h2 className="text-2xl font-semibold">Claim boundary</h2>
        <p className="mt-4 leading-7 text-slate-300">
          Product pages describe software capabilities and bounded execution evidence. They do not by themselves claim
          certification, independent audit, or universal correctness of future AI actions.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/contact" className="rounded-2xl bg-sky-300 px-5 py-3 font-semibold text-slate-950">
          Contact DSG
        </Link>
        <Link href="/privacy" className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white">
          Privacy
        </Link>
        <Link href="/terms" className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white">
          Terms
        </Link>
      </div>
    </main>
  );
}
