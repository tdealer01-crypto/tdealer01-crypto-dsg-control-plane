import Link from 'next/link';

const contactOptions = [
  {
    title: 'Enterprise pilot',
    text: 'For organizations evaluating invoice or payment approval governance with security and rollout review.',
  },
  {
    title: 'Pricing and packaging',
    text: 'For questions about Starter, Growth, Enterprise, pilot setup, or billing-backed feature gates.',
  },
  {
    title: 'Support and rollout',
    text: 'For onboarding planning, workflow rollout sequencing, and product support for approval operations.',
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Contact</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Talk to sales or plan a pilot</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Use this surface for enterprise pilot conversations, rollout planning, and product questions while the broader finance-governance application continues moving toward full marketplace readiness.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {contactOptions.map((option) => (
          <section key={option.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-semibold">{option.title}</h2>
            <p className="mt-4 leading-7 text-slate-200">{option.text}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
        <p className="text-sm text-slate-300">Suggested next actions</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/finance-governance" className="rounded-2xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950">
            View product page
          </Link>
          <Link href="/finance-governance/pricing" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
            View pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
