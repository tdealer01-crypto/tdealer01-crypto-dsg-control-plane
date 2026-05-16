import { NextRequest, NextResponse } from 'next/server';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

type Template = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  stars: number;
  popular: boolean;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category');
  const q = searchParams.get('q')?.toLowerCase();

  const config = getDsgSupabaseRpcConfig();

  const filters: Record<string, string> = {
    select: '*',
    order: 'stars.desc',
  };
  if (category) filters['category'] = `eq.${category}`;

  let templates = await readDsgRest<Template[]>(config, 'dsg_templates', filters);

  if (q) {
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.stack.some((s) => s.toLowerCase().includes(q)),
    );
  }

  return NextResponse.json({ ok: true, data: templates });
}
