'use client';

import { useEffect } from 'react';

export default function OperationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard/operations] error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-white">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300">Operations Error</p>
        <h2 className="mt-4 text-2xl font-bold text-red-100">Failed to load operations</h2>
        <p className="mt-4 text-sm leading-7 text-red-200/80">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-red-300/60">Error ID: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-red-500/20 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-500/30"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-xl border border-red-500/30 px-5 py-3 font-semibold text-red-200 transition hover:border-red-500/50"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
