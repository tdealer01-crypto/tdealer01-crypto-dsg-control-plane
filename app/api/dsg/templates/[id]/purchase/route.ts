import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import {
  buildTemplateSale,
  checkTemplateMonetizationEligibility,
  DEFAULT_COMMISSION_RATE_BPS,
} from '@/lib/dsg/marketplace/template-commission';
import type { DsgMarketTemplate } from '@/lib/dsg/app-builder/templates/template-registry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  seller_id: string | null;
  price_satang: number;
  sharing_mode: string;
  blocked_until: string[] | null;
};

function toMarketTemplateShape(row: TemplateRow): DsgMarketTemplate {
  return {
    id: row.slug,
    name: row.name,
    category: '',
    idealCustomer: '',
    businessOutcome: '',
    requiredPages: [],
    requiredApis: [],
    requiredData: [],
    requiredIntegrations: [],
    readinessGates: [],
    riskLevel: 'medium',
    smokeTests: [],
    blockedUntil: row.blocked_until ?? [],
    customizationSteps: [],
    version: '1.0.0',
    sharingMode: (row.sharing_mode as DsgMarketTemplate['sharingMode']) ?? 'public',
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const config = getDsgSupabaseRpcConfig();

    const [template] = await readDsgRest<TemplateRow[]>(config, 'dsg_templates', {
      select: 'id,slug,name,seller_id,price_satang,sharing_mode,blocked_until',
      id: `eq.${id}`,
    });

    if (!template) {
      return NextResponse.json({ ok: false, error: { code: 'TEMPLATE_NOT_FOUND' } }, { status: 404 });
    }
    if (!template.seller_id) {
      return NextResponse.json({ ok: false, error: { code: 'TEMPLATE_NOT_FOR_SALE' } }, { status: 422 });
    }
    if (template.seller_id === actor.actorId) {
      return NextResponse.json({ ok: false, error: { code: 'CANNOT_BUY_OWN_TEMPLATE' } }, { status: 422 });
    }

    const eligibility = checkTemplateMonetizationEligibility(
      toMarketTemplateShape(template),
      template.price_satang,
    );
    if (!eligibility.eligible) {
      return NextResponse.json(
        { ok: false, error: { code: 'TEMPLATE_NOT_ELIGIBLE', reason: eligibility.reason } },
        { status: 422 },
      );
    }

    const sale = buildTemplateSale({
      saleId: crypto.randomUUID(),
      templateId: template.id,
      sellerId: template.seller_id,
      buyerId: actor.actorId,
      priceSatang: template.price_satang,
      commissionRateBps: DEFAULT_COMMISSION_RATE_BPS,
    });

    if (template.price_satang > 0) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'thb',
              unit_amount: template.price_satang,
              product_data: { name: template.name },
            },
            quantity: 1,
          },
        ],
        metadata: {
          saleId: sale.saleId,
          buyerId: actor.actorId,
          sellerId: template.seller_id,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dsg/templates?purchase=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dsg/templates?purchase=cancelled`,
      });

      await callDsgRpc(config, 'record_template_sale', {
        p_sale_id: sale.saleId,
        p_template_id: sale.templateId,
        p_seller_id: sale.sellerId,
        p_buyer_id: sale.buyerId,
        p_price_satang: sale.priceSatang,
        p_commission_rate_bps: sale.commissionRateBps,
        p_platform_fee_satang: sale.platformFeeSatang,
        p_creator_payout_satang: sale.creatorPayoutSatang,
        p_status: 'PENDING',
        p_stripe_checkout_session_id: session.id,
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            saleId: sale.saleId,
            status: 'PENDING',
            priceSatang: sale.priceSatang,
            priceTHB: sale.priceSatang / 100,
            checkoutRequired: true,
            checkoutUrl: session.url,
          },
        },
        { status: 201 },
      );
    }

    // Free templates: record as CLEARED immediately — no Stripe needed
    await callDsgRpc(config, 'record_template_sale', {
      p_sale_id: sale.saleId,
      p_template_id: sale.templateId,
      p_seller_id: sale.sellerId,
      p_buyer_id: sale.buyerId,
      p_price_satang: sale.priceSatang,
      p_commission_rate_bps: sale.commissionRateBps,
      p_platform_fee_satang: sale.platformFeeSatang,
      p_creator_payout_satang: sale.creatorPayoutSatang,
      p_status: 'CLEARED',
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          saleId: sale.saleId,
          status: 'CLEARED',
          priceSatang: 0,
          priceTHB: 0,
          checkoutRequired: false,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PURCHASE_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
