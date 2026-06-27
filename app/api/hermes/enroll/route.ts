import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface EnrollPayload {
  profile_id: string;
  org_id: string;
  expires_at: number;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  let payload: EnrollPayload;
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((token.length * 3) & 3);
    payload = JSON.parse(atob(padded)) as EnrollPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid enrollment token' }, { status: 400 });
  }

  if (!payload.profile_id || !payload.org_id || typeof payload.expires_at !== 'number') {
    return NextResponse.json({ error: 'Malformed enrollment token' }, { status: 400 });
  }

  if (Date.now() > payload.expires_at) {
    return NextResponse.json({ error: 'Enrollment token expired' }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    profile_id: payload.profile_id,
    org_id: payload.org_id,
    expires_at: new Date(payload.expires_at).toISOString(),
    message: 'Enrollment token is valid. Complete enrollment via the Hermes dashboard.',
  });
}
