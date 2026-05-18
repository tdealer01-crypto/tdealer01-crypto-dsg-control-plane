import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Payment Successful — DSG ONE',
};

type PageProps = {
  searchParams: Promise<{ session_id?: string; templateId?: string }>;
};

export default async function SuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
            <p className="mt-6 text-lg font-semibold text-slate-300">Verifying payment…</p>
          </div>
        }
      >
        <SuccessContent sessionId={params.session_id} templateId={params.templateId} />
      </Suspense>
    </main>
  );
}
