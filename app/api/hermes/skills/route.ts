import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createSkill, listSkills } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  const sourceParam = sp.get('source');

  try {
    const page = await listSkills(access.orgId, {
      source: sourceParam === 'custom' || sourceParam === 'anthropic' ? sourceParam : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list skills' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const skill = await createSkill(access.orgId, {
      display_title: body.display_title != null ? String(body.display_title) : undefined,
      file_ids: Array.isArray(body.file_ids) ? (body.file_ids as string[]) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}
