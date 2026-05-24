/**
 * POST /api/agent/preflight
 *
 * HTTP endpoint for agentPreflight(). External agents and the dsg-one-v1
 * repo call this before any action to get a routing decision from the
 * ProofGate control plane.
 *
 * Returns:
 *   { decision: "allow",  requiredTools: [...], reason }
 *   { decision: "review", requiredEvidence: [...], reason }
 *   { decision: "block",  reason }
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { agentPreflight, type PreflightInput, type ActionType } from '../../../../lib/agent/preflight';

export const dynamic = 'force-dynamic';

const VALID_ACTIONS = new Set<ActionType>(['answer', 'edit_code', 'run_test', 'deploy', 'research']);

function isValidAction(v: unknown): v is ActionType {
  return typeof v === 'string' && VALID_ACTIONS.has(v as ActionType);
}

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'agent-preflight'),
      limit: 120,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 120) },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: org } = await admin
      .from('organizations')
      .select('plan')
      .eq('id', profile.org_id)
      .maybeSingle();

    const body = await request.json().catch(() => null);
    if (!body || typeof body.userGoal !== 'string') {
      return NextResponse.json(
        { error: 'userGoal (string) is required' },
        { status: 400 },
      );
    }

    if (!isValidAction(body.requestedAction)) {
      return NextResponse.json(
        { error: `requestedAction must be one of: ${[...VALID_ACTIONS].join(', ')}` },
        { status: 400 },
      );
    }

    const input: PreflightInput = {
      userGoal:        String(body.userGoal).slice(0, 2000),
      requestedAction: body.requestedAction,
      repoContext:     Array.isArray(body.repoContext)
                         ? (body.repoContext as unknown[]).map(String).slice(0, 20)
                         : [],
      orgPlan:         org?.plan ?? 'free',
      actorRole:       typeof body.actorRole === 'string' ? body.actorRole : undefined,
    };

    const decision = await agentPreflight(input);

    return NextResponse.json(
      { ok: true, ...decision },
      { headers: buildRateLimitHeaders(rateLimit, 120) },
    );
  } catch (error) {
    return handleApiError('api/agent/preflight', error);
  }
}
