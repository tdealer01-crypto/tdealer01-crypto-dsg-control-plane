import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await (admin as any)
      .from('marketing_content')
      .select('id, title, slug, keyword, meta_description, created_at')
      .eq('type', 'seo_article')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ articles: [] });
    return NextResponse.json({ articles: data ?? [] });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
