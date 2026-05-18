import { cookies } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'App Created — DSG ONE',
};

type SearchParams = Promise<{ app_id?: string; slug?: string; html_url?: string }>;

export default async function InstalledPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams;
  const cookieStore = await cookies();

  const appId = params.app_id ?? '';
  const slug = params.slug ?? '';
  const htmlUrl = params.html_url ?? '';
  const pem = cookieStore.get('gh_app_pem')?.value ?? '';
  const webhookSecret = cookieStore.get('gh_app_webhook_secret')?.value ?? '';
  const clientSecret = cookieStore.get('gh_app_client_secret')?.value ?? '';

  const envRows = [
    { key: 'GITHUB_APP_ID', value: appId || '(not received)' },
    { key: 'GITHUB_APP_PRIVATE_KEY', value: pem ? '(see below)' : '(not received — re-install)' },
    { key: 'GITHUB_APP_WEBHOOK_SECRET', value: webhookSecret || '(not received — re-install)' },
    { key: 'GITHUB_APP_CLIENT_SECRET', value: clientSecret ? '(see below)' : '(not received — re-install)' },
  ];

  if (!appId && !pem) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-4xl">&#x26D4;</p>
          <h1 className="mt-4 text-xl font-bold">No app credentials found</h1>
          <p className="mt-2 text-sm text-slate-400">The session may have expired. Please install again.</p>
          <Link href="/github-app" className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400">Try again →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="text-4xl">&#x2705;</div>
          <h1 className="mt-4 text-2xl font-bold">GitHub App created!</h1>
          <p className="mt-2 text-slate-400">
            <strong className="text-slate-100">{slug || 'DSG ONE Gate'}</strong> is ready.
            Copy the env vars below into Vercel, then redeploy.
          </p>
          {htmlUrl && (
            <Link href={htmlUrl} className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
              View app on GitHub →
            </Link>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold">Vercel Environment Variables</h2>
          <p className="mt-1 text-sm text-red-400">Save these now — this page expires in 5 minutes.</p>
          <div className="mt-4 space-y-3">
            {envRows.map((row) => (
              <div key={row.key}>
                <p className="mb-1 text-xs font-semibold text-slate-400">{row.key}</p>
                <div className="rounded-lg bg-slate-950 px-4 py-2 font-mono text-sm text-emerald-300 break-all">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {pem && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="text-lg font-bold text-amber-300">GITHUB_APP_PRIVATE_KEY</h2>
            <p className="mt-1 text-xs text-amber-400">Copy the entire block including BEGIN/END lines.</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300 whitespace-pre-wrap break-all">{pem}</pre>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/github-app" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-emerald-400">← Back</Link>
          <Link href="/dashboard" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black hover:bg-emerald-400">Go to dashboard →</Link>
        </div>
      </div>
    </main>
  );
}
