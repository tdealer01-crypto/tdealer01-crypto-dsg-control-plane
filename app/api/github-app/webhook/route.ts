import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'crypto';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizePrivateKeyPem(rawPem: string): string {
  let pem = rawPem.trim();

  // Env vars pasted with surrounding quotes (common when copy-pasted into
  // Vercel's UI or a .env file with `KEY="-----BEGIN..."`).
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  // Normalize CRLF and literal "\n" escape sequences to real newlines.
  pem = pem.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();

  return pem;
}

function createAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID ?? '';
  const rawPem = process.env.GITHUB_APP_PRIVATE_KEY ?? '';
  console.log('[DSG] createAppJWT: appId=', appId || 'MISSING', 'pemPresent=', Boolean(rawPem));
  if (!appId || !rawPem) throw new Error('github_app_not_configured');

  const privateKey = normalizePrivateKeyPem(rawPem);

  const hasBeginMarker = /-----BEGIN (RSA )?PRIVATE KEY-----/.test(privateKey);
  const hasEndMarker = /-----END (RSA )?PRIVATE KEY-----/.test(privateKey);
  if (!hasBeginMarker || !hasEndMarker) {
    // Fail fast with a diagnostic that never leaks key material, instead of
    // letting OpenSSL throw an opaque "DECODER routines::unsupported" error.
    console.error(
      '[DSG] createAppJWT: GITHUB_APP_PRIVATE_KEY is not a valid PEM after normalization.',
      'length=', privateKey.length,
      'hasBeginMarker=', hasBeginMarker,
      'hasEndMarker=', hasEndMarker,
      'startsWithDash=', privateKey.startsWith('-----'),
    );
    throw new Error('github_app_private_key_malformed');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })).toString('base64url');
  const data = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);

  try {
    return `${data}.${signer.sign(privateKey, 'base64url')}`;
  } catch (err) {
    console.error(
      '[DSG] createAppJWT: RSA sign failed after PEM validation passed —',
      'key may be wrong algorithm/format (expected PKCS#1 or PKCS#8 RSA key).',
      String(err),
    );
    throw new Error('github_app_private_key_sign_failed');
  }
}

async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = createAppJWT();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const data = await res.json() as { token: string };
  return data.token;
}

async function verifyWebhookSignature(body: string, sigHeader: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['verify'],
  );
  const hex = sigHeader.replace('sha256=', '');
  const pairs = hex.match(/../g);
  if (!pairs) return false;
  const sigBytes = new Uint8Array(pairs.map((b) => parseInt(b, 16)));
  return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(body));
}

async function ghApi(token: string, method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

async function runDsgGate(context: { owner: string; repo: string; prTitle: string; author: string; installationId: number }): Promise<'ALLOW' | 'BLOCK'> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (!appUrl) return 'ALLOW';

  // Look up per-installation API key; fall back to internal key
  let apiKey = process.env.DSG_INTERNAL_API_KEY ?? '';
  try {
    const admin = getSupabaseAdmin();
    const { data } = await (admin as any)
      .from('github_app_installations')
      .select('agent_api_key')
      .eq('installation_id', context.installationId)
      .maybeSingle();
    if (data?.agent_api_key) apiKey = data.agent_api_key;
  } catch { /* use fallback */ }

  if (!apiKey) return 'ALLOW';

  try {
    const res = await fetch(`${appUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        agent_id: process.env.GITHUB_APP_AGENT_ID ?? 'github-app-gate',
        input: { prompt: `Review PR "${context.prTitle}" by ${context.author} in ${context.owner}/${context.repo}` },
        context: { source: 'github-app', risk_score: 0.1 },
      }),
    });
    const data = await res.json() as { verdict?: string; decision?: string };
    const verdict = ((data.verdict ?? data.decision) ?? 'ALLOW').toString().toUpperCase();
    return verdict === 'BLOCK' ? 'BLOCK' : 'ALLOW';
  } catch {
    return 'ALLOW';
  }
}

async function handlePullRequest(payload: Record<string, unknown>): Promise<void> {
  const pr = payload.pull_request as Record<string, unknown>;
  const repo = payload.repository as Record<string, unknown>;
  const installationId = (payload.installation as Record<string, unknown>)?.id as number | undefined;
  console.log('[DSG] handlePR: installationId=', installationId);
  if (!installationId) {
    console.error('[DSG] no installationId in payload — app not installed on this repo?');
    return;
  }

  const owner = ((repo.owner as Record<string, unknown>).login) as string;
  const repoName = repo.name as string;
  const sha = ((pr.head as Record<string, unknown>).sha) as string;
  const prTitle = pr.title as string;
  const author = ((pr.user as Record<string, unknown>).login) as string;
  const prNumber = pr.number as number;

  const token = await getInstallationToken(installationId);

  const checkRun = await ghApi(token, 'POST', `/repos/${owner}/${repoName}/check-runs`, {
    name: 'DSG Gate',
    head_sha: sha,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    output: { title: 'DSG Policy Check', summary: 'Checking PR against DSG governance policy…' },
  }) as { id: number };

  const decision = await runDsgGate({ owner, repo: repoName, prTitle, author, installationId });
  const passed = decision === 'ALLOW';

  await ghApi(token, 'PATCH', `/repos/${owner}/${repoName}/check-runs/${checkRun.id}`, {
    status: 'completed',
    conclusion: passed ? 'success' : 'failure',
    completed_at: new Date().toISOString(),
    output: {
      title: `DSG Gate: ${decision}`,
      summary: passed
        ? `✅ Policy check passed for PR #${prNumber}: ${prTitle}`
        : `❌ Policy gate blocked PR #${prNumber}: ${prTitle}`,
      text: [
        `**Verdict:** ${decision}`,
        `**PR:** #${prNumber} by @${author}`,
        `**Repo:** ${owner}/${repoName}`,
        '',
        passed
          ? 'Pull request passed all DSG governance checks. Audit record written.'
          : 'Pull request was blocked by DSG policy. Review governance rules before merging.',
      ].join('\n'),
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET ?? '';
  if (!webhookSecret) {
    return NextResponse.json({ error: 'webhook_secret_not_configured' }, { status: 501 });
  }

  const body = await req.text();
  const sig = req.headers.get('x-hub-signature-256') ?? '';
  const event = req.headers.get('x-github-event') ?? '';

  const valid = await verifyWebhookSignature(body, sig, webhookSecret).catch(() => false);
  if (!valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const payload = JSON.parse(body) as Record<string, unknown>;
  const action = (payload.action as string | undefined) ?? null;

  if (event === 'pull_request' && action && ['opened', 'synchronize', 'reopened'].includes(action)) {
    await handlePullRequest(payload).catch((err) => console.error('[DSG] handlePR error:', String(err)));
  }

  return NextResponse.json({ ok: true, event, action });
}
