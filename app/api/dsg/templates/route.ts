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

function publicErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'DSG_TEMPLATES_UNKNOWN_ERROR';
  return error.message.replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const q = searchParams.get('q')?.toLowerCase();

    const config = getDsgSupabaseRpcConfig();

    const filters: Record<string, string> = {
      select: '*',
      order: 'stars.desc',
    };
    if (category) filters.category = `eq.${category}`;

    let templates = await readDsgRest<Template[]>(config, 'dsg_templates', filters);

    if (q) {
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.stack.some((s) => s.toLowerCase().includes(q)),
      );
    }

    return NextResponse.json({ ok: true, data: templates, count: templates.length });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DSG_TEMPLATES_READ_FAILED',
        detail: publicErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
