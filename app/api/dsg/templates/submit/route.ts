import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { checkTemplateMonetizationEligibility } from '@/lib/dsg/marketplace/template-commission';
import type { DsgMarketTemplate } from '@/lib/dsg/app-builder/templates/template-registry';

type SubmitBody = {
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  price_satang: number;
  version?: string;
  blockedUntil?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:create');
    const body = (await req.json()) as SubmitBody;

    if (!body.slug || !body.name || !body.description || !body.category) {
      return NextResponse.json({ ok: false, error: { code: 'SUBMIT_FIELDS_REQUIRED' } }, { status: 400 });
    }
    if (typeof body.price_satang !== 'number' || body.price_satang < 0) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_PRICE' } }, { status: 400 });
    }

    // Build a minimal DsgMarketTemplate shape to run the eligibility check.
    // This does not mark the marketplace PASS; it only blocks unsafe monetization inputs.
    const candidate: Pick<DsgMarketTemplate, 'id' | 'sharingMode' | 'blockedUntil'> & Partial<DsgMarketTemplate> = {
      id: body.slug,
      sharingMode: 'public',
      blockedUntil: body.blockedUntil ?? [],
      name: body.name,
      category: body.category,
      idealCustomer: '',
      businessOutcome: '',
      requiredPages: [],
      requiredApis: [],
      requiredData: [],
      requiredIntegrations: [],
      readinessGates: [],
      riskLevel: 'medium',
      smokeTests: [],
      customizationSteps: [],
      version: body.version ?? '1.0.0',
    };

    const eligibility = checkTemplateMonetizationEligibility(candidate as DsgMarketTemplate, body.price_satang);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { ok: false, error: { code: 'TEMPLATE_NOT_ELIGIBLE', reason: eligibility.reason } },
        { status: 422 },
      );
    }

    const config = getDsgSupabaseRpcConfig();
    const templateId = await callDsgRpc<string>(config, 'submit_template_for_sale', {
      p_actor_id: actor.actorId,
      p_slug: body.slug,
      p_name: body.name,
      p_description: body.description,
      p_category: body.category,
      p_stack: body.stack ?? [],
      p_price_satang: body.price_satang,
    });

    return NextResponse.json({ ok: true, data: { id: templateId } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TEMPLATE_SUBMIT_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
