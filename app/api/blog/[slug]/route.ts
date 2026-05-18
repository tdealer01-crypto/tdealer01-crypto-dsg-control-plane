import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const admin = getSupabaseAdmin();
    const { data, error } = await (admin as any)
      .from('marketing_content')
      .select('id, title, slug, keyword, meta_description, body, created_at')
      .eq('type', 'seo_article')
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
