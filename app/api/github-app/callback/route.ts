import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Called by GitHub after user installs the app from the manifest flow.
// Exchanges the one-time code for app credentials (app_id, pem, webhook_secret).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!code) {
    return NextResponse.redirect(`${appUrl}/github-app?error=missing_code`);
  }

  const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    return NextResponse.redirect(`${appUrl}/github-app?error=conversion_failed`);
  }

  const app = await res.json() as {
    id: number;
    slug: string;
    html_url: string;
    webhook_secret: string;
    pem: string;
    client_id: string;
    client_secret: string;
  };

  // Surface the credentials so the operator can add them to Vercel env vars.
  // In production you could store these in Supabase instead.
  const params = new URLSearchParams({
    app_id: String(app.id),
    slug: app.slug,
    html_url: app.html_url,
    // pem and webhook_secret shown on the installed page — never in URL
  });

  // Store pem + webhook_secret temporarily in a short-lived cookie so the
  // installed page can display them once (they are never logged or stored).
  const response = NextResponse.redirect(`${appUrl}/github-app/installed?${params}`);
  response.cookies.set('gh_app_pem', app.pem, { httpOnly: true, maxAge: 300, path: '/' });
  response.cookies.set('gh_app_webhook_secret', app.webhook_secret, { httpOnly: true, maxAge: 300, path: '/' });
  response.cookies.set('gh_app_client_secret', app.client_secret, { httpOnly: true, maxAge: 300, path: '/' });
  return response;
}
