// ERROR_HANDLER_EXEMPT - legacy error handling, migrate to handleApiError
import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

type SaleRow = {
  sale_id: string;
  template_id: string;
  price_satang: number;
  created_at: string;
};

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
};

export type PurchasedTemplate = {
  saleId: string;
  templateId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  priceSatang: number;
  priceTHB: number;
  purchasedAt: string;
};

export async function GET(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const config = getDsgSupabaseRpcConfig();

    const sales = await readDsgRest<SaleRow[]>(config, 'dsg_template_sales', {
      select: 'sale_id,template_id,price_satang,created_at',
      buyer_id: `eq.${actor.actorId}`,
      status: 'eq.CLEARED',
      order: 'created_at.desc',
    });

    if (sales.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const templateIds = sales.map((s) => s.template_id).join(',');
    const templates = await readDsgRest<TemplateRow[]>(config, 'dsg_templates', {
      select: 'id,slug,name,description,category,stack',
      id: `in.(${templateIds})`,
    });

    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const purchases: PurchasedTemplate[] = sales.flatMap((sale) => {
      const tmpl = templateMap.get(sale.template_id);
      if (!tmpl) return [];
      return [
        {
          saleId: sale.sale_id,
          templateId: sale.template_id,
          slug: tmpl.slug,
          name: tmpl.name,
          description: tmpl.description,
          category: tmpl.category,
          stack: tmpl.stack ?? [],
          priceSatang: sale.price_satang,
          priceTHB: sale.price_satang / 100,
          purchasedAt: sale.created_at,
        },
      ];
    });

    return NextResponse.json({ ok: true, data: purchases });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PURCHASES_FETCH_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
