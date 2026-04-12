import Link from 'next/link';

const supportChannels = [
  {
    title: 'General support',
    contact: 'support@dsg.one',
    target: 'mailto:support@dsg.one',
    response: 'First response within 4 business hours (Mon–Fri, 09:00–18:00 UTC).',
    scope: 'Login issues, onboarding guidance, and product questions.',
  },
  {
    title: 'Security and incident desk',
    contact: 'security@dsg.one',
    target: 'mailto:security@dsg.one',
    response: 'Critical reports are triaged 24/7 with acknowledgement within 1 hour.',
    scope: 'Security disclosures, suspicious activity, and incident coordination.',
  },
  {
    title: 'Enterprise success',
    contact: 'enterprise@dsg.one',
    target: 'mailto:enterprise@dsg.one',
    response: 'Named account response within 2 business hours for Business/Enterprise plans.',
    scope: 'Pilot planning, procurement, rollout, and compliance evidence requests.',
  },
];

const supportChecklist = [
  'Organization ID and environment (staging / production).',
  'Route or API path you were using when the issue occurred.',
  'UTC timestamp and request identifier (if available).',
  'Expected behavior vs. actual behavior, plus screenshots when possible.',
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Support</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Get help from the DSG Control Plane team.</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          If you need product, billing, or security support, contact the channel below and we will route your request to the
          correct responder immediately.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {supportChannels.map((channel) => (
            <article key={channel.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-semibold text-white">{channel.title}</p>
              <a
                href={channel.target}
                className="mt-3 inline-block text-sm font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-4"
              >
                {channel.contact}
              </a>
              <p className="mt-3 text-sm text-slate-300">{channel.response}</p>
              <p className="mt-2 text-sm text-slate-400">{channel.scope}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-semibold">Before you contact support</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Sending the details below helps us resolve issues in one pass and reduce back-and-forth.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-200">
            {supportChecklist.map((item) => (
              <li key={item} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm font-semibold text-emerald-100">Status and trust resources</p>
            <p className="mt-2 text-sm text-emerald-50/90">
              For legal and security references, use the published documents on{' '}
              <Link href="/security" className="underline">
                Security
              </Link>{' '}
              ,{' '}
              <Link href="/privacy" className="underline">
                Privacy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="underline">
                Terms
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
