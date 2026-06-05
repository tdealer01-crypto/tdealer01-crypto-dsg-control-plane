import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';
import { summarizeCreatorPayouts } from '@/lib/dsg/marketplace/template-commission';
import type { TemplateSale } from '@/lib/dsg/marketplace/template-commission';

type SaleRow = {
  sale_id: string;
  template_id: string;
  seller_id: string;
  buyer_id: string;
  price_satang: number;
  commission_rate_bps: number;
  platform_fee_satang: number;
  creator_payout_satang: number;
  status: string;
  created_at: string;
};

function toTemplateSale(row: SaleRow): TemplateSale {
  return {
    saleId: row.sale_id,
    templateId: row.template_id,
    sellerId: row.seller_id,
    buyerId: row.buyer_id,
    priceSatang: row.price_satang,
    commissionRateBps: row.commission_rate_bps,
    platformFeeSatang: row.platform_fee_satang,
    creatorPayoutSatang: row.creator_payout_satang,
    createdAt: row.created_at,
    status: row.status as TemplateSale['status'],
  };
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const config = getDsgSupabaseRpcConfig();

    const rows = await readDsgRest<SaleRow[]>(config, 'dsg_template_sales', {
      select: 'sale_id,template_id,seller_id,buyer_id,price_satang,commission_rate_bps,platform_fee_satang,creator_payout_satang,status,created_at',
      seller_id: `eq.${actor.actorId}`,
      order: 'created_at.desc',
    });

    const sales = rows.map(toTemplateSale);
    const summary = summarizeCreatorPayouts(actor.actorId, sales);

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          ...summary,
          clearedPayoutTHB: summary.clearedPayoutSatang / 100,
          pendingPayoutTHB: summary.pendingPayoutSatang / 100,
          totalRevenueTHB: summary.totalRevenueSatang / 100,
        },
        recentSales: sales.slice(0, 20),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PAYOUTS_FETCH_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
