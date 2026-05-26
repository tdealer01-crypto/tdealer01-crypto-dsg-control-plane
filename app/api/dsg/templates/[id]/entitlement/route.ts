import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';

type EntitlementRpcRow = {
  allowed: boolean;
  reason: string;
  sale_status: string | null;
  price_satang: number | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const { id } = await params;

    const config = getDsgSupabaseRpcConfig();
    const rows = await callDsgRpc<EntitlementRpcRow[]>(config, 'can_use_template', {
      p_actor_id: actor.actorId,
      p_template_id: id,
    });

    const decision = rows?.[0] ?? {
      allowed: false,
      reason: 'TEMPLATE_NOT_FOUND',
      sale_status: null,
      price_satang: null,
    };

    const status = decision.allowed || decision.reason === 'TEMPLATE_NOT_FOUND' ? 200 : 403;

    return NextResponse.json(
      {
        ok: true,
        data: {
          templateId: id,
          actorId: actor.actorId,
          allowed: decision.allowed,
          reason: decision.reason,
          saleStatus: decision.sale_status,
          priceSatang: decision.price_satang,
          nextAction: decision.allowed
            ? 'Allow template use.'
            : 'Require a CLEARED purchase before granting paid template access.',
        },
      },
      { status },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TEMPLATE_ENTITLEMENT_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
