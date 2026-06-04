import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createUserProfile, listUserProfiles } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  try {
    const page = await listUserProfiles(access.orgId, {
      order: (sp.get('order') as 'asc' | 'desc') ?? 'desc',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list user profiles' }, { status: 500 });
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

  if (!body.external_id) {
    return NextResponse.json({ error: 'external_id is required' }, { status: 400 });
  }

  try {
    const profile = await createUserProfile(access.orgId, {
      external_id: String(body.external_id),
      name: body.name != null ? String(body.name) : undefined,
      relationship: body.relationship as any,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
  }
}
