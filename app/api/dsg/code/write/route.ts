/**
 * POST /api/dsg/code/write
 * Write a code file into the /tmp/dsg-code sandbox.
 * All writes are gated: path must be under /tmp/dsg-code/, no secrets allowed.
 */
import { NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { requireOrgRole } from '@/lib/authz';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

const SANDBOX_ROOT = '/tmp/dsg-code';

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9\-_]+/,
  /sk-proj-[A-Za-z0-9\-_]+/,
  /SUPABASE_SERVICE_ROLE/i,
  /supabase.*service.*role.*key/i,
  /VERCEL_TOKEN/i,
  /STRIPE_SECRET/i,
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
];

function containsSecret(content: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(content));
}

function isSafeFilename(name: string): boolean {
  return /^[a-zA-Z0-9_\-./]+$/.test(name) && !name.includes('..');
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const body = await readJsonBody(request, { maxBytes: 64 * 1024 });
  if (!body.ok) return NextResponse.json({ ok: false, error: body.error }, { status: 400 });

  const { filename, content, language } = (body.value ?? {}) as Record<string, unknown>;

  if (!filename || typeof filename !== 'string') {
    return NextResponse.json({ ok: false, error: 'filename is required' }, { status: 400 });
  }
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 });
  }
  if (!isSafeFilename(filename)) {
    return NextResponse.json({ ok: false, error: 'unsafe filename' }, { status: 400 });
  }
  if (containsSecret(content)) {
    return NextResponse.json({ ok: false, error: 'content contains likely secret — write blocked' }, { status: 400 });
  }

  const safePath = resolve(SANDBOX_ROOT, filename);
  if (!safePath.startsWith(SANDBOX_ROOT + '/') && safePath !== SANDBOX_ROOT) {
    return NextResponse.json({ ok: false, error: 'path traversal blocked' }, { status: 400 });
  }

  try {
    mkdirSync(dirname(safePath), { recursive: true });
    writeFileSync(safePath, content, { encoding: 'utf-8', mode: 0o644 });
  } catch {
    return NextResponse.json({ ok: false, error: 'write failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: safePath,
    language: typeof language === 'string' ? language : 'unknown',
    bytes: Buffer.byteLength(content, 'utf-8'),
  });
}
