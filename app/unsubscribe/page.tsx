import Link from 'next/link';
import { getSupabaseAdmin } from '../../lib/supabase-server';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Unsubscribe — DSG ONE' };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  let status: 'ok' | 'missing' | 'error' = 'missing';

  if (email) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await (supabase as any)
        .from('leads')
        .update({ intent: 'unsubscribed', outreach_sent: true, outreach_sent_at: new Date().toISOString() })
        .eq('email', email);
      status = error ? 'error' : 'ok';
    } catch {
      status = 'error';
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-white">
      {status === 'ok' ? (
        <>
          <div className="mb-6 text-5xl">✅</div>
          <h1 className="mb-3 text-2xl font-bold">Unsubscribed</h1>
          <p className="text-center text-slate-400">
            <strong className="text-white">{email}</strong> has been removed from our outreach list.
            You won&apos;t receive any more emails from us.
          </p>
        </>
      ) : status === 'missing' ? (
        <>
          <div className="mb-6 text-5xl">⚠️</div>
          <h1 className="mb-3 text-2xl font-bold">Invalid link</h1>
          <p className="text-slate-400">No email address found in this link.</p>
        </>
      ) : (
        <>
          <div className="mb-6 text-5xl">❌</div>
          <h1 className="mb-3 text-2xl font-bold">Something went wrong</h1>
          <p className="text-slate-400">
            Please reply to the email directly and we&apos;ll remove you manually.
          </p>
        </>
      )}
      <Link
        href="/"
        className="mt-10 text-sm text-emerald-400 underline"
      >
        ← Back to DSG ONE
      </Link>
    </main>
  );
}
