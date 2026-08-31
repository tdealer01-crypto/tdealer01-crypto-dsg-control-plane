import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import {
  authorizeCandidateRealization,
  signRealizationAuthorizationReceipt,
  type GitHubPlanClient,
} from '@/lib/agent-governance/agentic-org/realization-authorization';

export const dynamic = 'force-dynamic';

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const supplied = header.replace(/^sha256=/i, '').trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(supplied, expected);
}

export async function POST(request: NextRequest) {
  const secret = process.env.DSG_REALIZATION_AUTHORIZATION_SECRET?.trim()
    || process.env.DSG_PROMOTION_EVALUATION_SECRET?.trim();
  const githubToken = process.env.DSG_GITHUB_AUTOMATION_TOKEN?.trim()
    || process.env.GITHUB_TOKEN?.trim();

  if (!secret || !githubToken) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'REALIZATION_AUTHORIZATION_NOT_CONFIGURED',
      missing: [
        ...(!secret ? ['DSG_REALIZATION_AUTHORIZATION_SECRET_OR_DSG_PROMOTION_EVALUATION_SECRET'] : []),
        ...(!githubToken ? ['DSG_GITHUB_AUTOMATION_TOKEN_OR_GITHUB_TOKEN'] : []),
      ],
    }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-dsg-signature'), secret)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'REALIZATION_AUTHORIZATION_SIGNATURE_INVALID' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'REALIZATION_AUTHORIZATION_INVALID_JSON' }, { status: 400 });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !('spec' in parsed)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'REALIZATION_AUTHORIZATION_PAYLOAD_INVALID' }, { status: 400 });
  }

  const octokit = new Octokit({ auth: githubToken });
  const client: GitHubPlanClient = {
    getContent: (input) => octokit.rest.repos.getContent(input) as unknown as Promise<{ data: unknown }>,
    compareCommits: (input) => octokit.rest.repos.compareCommitsWithBasehead(input) as unknown as Promise<{
      data: { status: string; files?: Array<{ filename: string }> };
    }>,
  };

  try {
    const receipt = await authorizeCandidateRealization(
      client,
      (parsed as { spec: unknown }).spec,
    );
    const receiptSignature = signRealizationAuthorizationReceipt(receipt, secret);
    return NextResponse.json({
      status: 'PASS',
      reason: 'REALIZATION_AUTHORIZED',
      receipt,
      receiptSignature,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'REALIZATION_AUTHORIZATION_FAILED';
    return NextResponse.json({ status: 'BLOCK', reason }, { status: 409 });
  }
}
