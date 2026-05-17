import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/dsg-bridge/templates — proxy to DSG_ONE_V1_URL/api/dsg/templates
export async function GET(request: NextRequest) {
  const dsgOneUrl = process.env.DSG_ONE_V1_URL;
  if (!dsgOneUrl) {
    return NextResponse.json({ error: 'DSG_ONE_V1_URL not configured' }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const upstream = new URL(`${dsgOneUrl}/api/dsg/templates`);

  const category = searchParams.get('category');
  const search = searchParams.get('search');
  if (category) upstream.searchParams.set('category', category);
  if (search) upstream.searchParams.set('search', search);

  const res = await fetch(upstream.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error ?? 'Templates fetch failed' },
      { status: res.status },
    );
  }

  return NextResponse.json(data);
}
