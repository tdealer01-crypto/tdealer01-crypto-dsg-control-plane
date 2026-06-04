import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getUserProfile } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;

  try {
    const profile = await getUserProfile(access.orgId, id);
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }

  const expiresAt = Date.now() + 3600_000;
  const payload = JSON.stringify({ profile_id: id, org_id: access.orgId, expires_at: expiresAt });
  const token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const origin = req.nextUrl.origin;
  const enrollmentUrl = `${origin}/api/hermes/enroll?token=${token}`;

  return NextResponse.json({ enrollment_url: enrollmentUrl, expires_at: new Date(expiresAt).toISOString() });
}
