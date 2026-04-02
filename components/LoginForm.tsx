'use client';

import { useState } from 'react';

type Props = {
  next: string;
  orgSlug?: string;
  ssoFirst?: boolean;
};

export default function LoginForm({ next, orgSlug, ssoFirst }: Props) {
  const [mode, setMode] = useState<'login' | 'trial'>('login');

  return (
    <div>
      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={[
            'flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition',
            mode === 'login' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white',
          ].join(' ')}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('trial')}
          className={[
            'flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition',
            mode === 'trial' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white',
          ].join(' ')}
        >
          Start Free Trial
        </button>
      </div>

      <form action="/auth/continue" method="post" className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        {orgSlug ? <input type="hidden" name="org" value={orgSlug} /> : null}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@company.com"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
          />
        </div>

        {mode === 'trial' && (
          <div>
            <label htmlFor="workspace_name" className="mb-2 block text-sm font-medium text-slate-200">
              Workspace name
            </label>
            <input
              id="workspace_name"
              name="workspace_name"
              type="text"
              required
              placeholder="Acme Ops"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>
        )}

        {mode === 'trial' && (
          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-slate-200">
              Full name (optional)
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              placeholder="Jane Doe"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-slate-100 outline-none"
            />
          </div>
        )}

        <button className="w-full rounded-2xl bg-emerald-400 px-5 py-4 font-semibold text-slate-950 transition hover:scale-[1.01]">
          {mode === 'login' ? (ssoFirst ? 'Use email recovery link' : 'Send magic link') : 'Start free trial'}
        </button>
      </form>

      {mode === 'login' && (
        <p className="mt-4 text-center text-sm text-slate-400">
          New here?{' '}
          <button type="button" onClick={() => setMode('trial')} className="text-emerald-300 underline">
            Start a free trial
          </button>
        </p>
      )}

      {mode === 'trial' && (
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button type="button" onClick={() => setMode('login')} className="text-emerald-300 underline">
            Login with email
          </button>
        </p>
      )}
    </div>
  );
}
