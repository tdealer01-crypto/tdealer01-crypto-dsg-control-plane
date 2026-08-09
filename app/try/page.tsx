import Link from 'next/link';
import TryChatWidget from '../../components/TryChatWidget';

const OUTCOMES = [
  {
    status: 'PASS',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    title: 'Allowed to continue',
    desc: 'The evaluated action satisfies the active gate. The result should include the reason and available evidence for that decision.',
  },
  {
    status: 'REVIEW',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    title: 'Human decision required',
    desc: 'DSG stops automatic continuation when approval, missing evidence, or another review condition must be resolved first.',
  },
  {
    status: 'BLOCK',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    title: 'Action not permitted',
    desc: 'The action is not allowed under the evaluated policy or evidence state. DSG returns the blocking reason instead of silently continuing.',
  },
];

const FLOW = [
  ['1', 'Sign in', 'Use your authenticated workspace. Privileged backend credentials are never placed in this browser page.'],
  ['2', 'Submit an action', 'Send the action or policy decision you want DSG to evaluate.'],
  ['3', 'Read the decision', 'See PASS, REVIEW, or BLOCK together with the reason returned by the governed backend.'],
  ['4', 'Verify evidence', 'Open the proof or audit surface when evidence is available for that real execution.'],
];

export default function TryPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-black text-white">DSG ONE</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/demo" className="text-slate-400 transition-colors hover:text-white">Demo</Link>
            <Link href="/auth/login" className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400">Sign in</Link>
          </div>
        </div>
      </nav>

      <section className="px-4 pb-16 pt-20 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="mb-6 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            Customer portal
          </span>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Know whether an AI action can continue
            <span className="mt-2 block text-emerald-400">before execution moves forward</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            DSG evaluates the requested action against its governed backend and returns a clear decision: PASS, REVIEW, or BLOCK. Real evidence is shown only when the execution actually produced it.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/auth/login" className="rounded-2xl bg-emerald-500 px-9 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
              Sign in to use DSG →
            </Link>
            <Link href="/demo" className="rounded-2xl border border-white/15 px-8 py-4 font-bold text-slate-300 hover:border-white/30 hover:text-white">
              View demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">No secret API keys are requested or displayed on this page.</p>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Decision contract</p>
            <h2 className="mt-2 text-3xl font-black text-white">One result. A clear next action.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {OUTCOMES.map((outcome) => (
              <article key={outcome.status} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${outcome.tone}`}>{outcome.status}</span>
                <h3 className="mt-5 text-xl font-black text-white">{outcome.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{outcome.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-slate-900 p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">How to use it</p>
            <h2 className="mt-2 text-3xl font-black text-white">From request to verifiable result</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {FLOW.map(([num, title, desc]) => (
              <div key={num} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 font-black text-emerald-400">{num}</div>
                <h3 className="mt-4 font-black text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Evidence</p>
            <h2 className="mt-2 text-2xl font-black text-white">Check what the system actually proved</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Evidence IDs, hashes, timestamps, or exports must come from a real execution. DSG does not create fake proof values for this customer page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/proofs" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:border-emerald-500/40">Proofs</Link>
              <Link href="/compliance/export" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:border-emerald-500/40">Evidence export</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Ask before signing in</p>
            <h2 className="mt-2 text-2xl font-black text-white">DSG Assistant</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Ask how the gate, evidence, or customer flow works. The assistant uses a configured live server-side AI provider and reports an unavailable state rather than inventing an answer when no provider responds.
            </p>
            <p className="mt-5 text-xs text-slate-500">Open the “Ask DSG Assistant” button in the lower-right corner.</p>
          </div>
        </div>
      </section>

      <TryChatWidget />
    </main>
  );
}
