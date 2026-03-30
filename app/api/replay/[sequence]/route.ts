import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getDSGCoreLedger } from '../../../../lib/dsg-core';
import { replayStateToSequence } from '../../../../lib/runtime/checkpoints';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { sequence: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const key = params.sequence;
    const parsedSequence = Number(key);

    if (Number.isFinite(parsedSequence) && parsedSequence >= 0) {
      const replay = await replayStateToSequence(String(profile.org_id), parsedSequence);
      return NextResponse.json({ ok: true, mode: 'sequence', ...replay });
    }

    const executionId = key;

    const [{ data: execution, error: executionError }, { data: audit, error: auditError }, coreLedger] =
      await Promise.all([
        supabase
          .from('executions')
          .select(`
          id,
          org_id,
          agent_id,
          decision,
          latency_ms,
          request_payload,
          context_payload,
          policy_version,
          reason,
          created_at
        `)
          .eq('org_id', profile.org_id)
          .eq('id', executionId)
          .maybeSingle(),
        supabase
          .from('audit_logs')
          .select(`
          id,
          execution_id,
          decision,
          reason,
          evidence,
          created_at
        `)
          .eq('org_id', profile.org_id)
          .eq('execution_id', executionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        getDSGCoreLedger(50),
      ]);

    if (executionError) {
      return NextResponse.json({ error: executionError.message }, { status: 500 });
    }

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const coreMatch =
      (coreLedger.items || []).find((item: any) => {
        const metadata = item?.metadata || {};
        return metadata?.execution_id === executionId || metadata?.audit_id === audit?.id;
      }) || null;

    return NextResponse.json({
      ok: true,
      mode: 'execution',
      execution,
      audit,
      core: {
        ledger_ok: coreLedger.ok,
        matched_item: coreMatch,
        error: coreLedger.ok ? null : coreLedger.error,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
