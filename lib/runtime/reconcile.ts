import { getSupabaseAdmin } from '../supabase-server';
import type { Json } from '../database.types';

export async function reconcileEffectCallback(input: {
  effectId: string;
  orgId: string;
  status: 'succeeded' | 'failed';
  payload: unknown;
}) {
  const supabase = getSupabaseAdmin();

  const { data: effect, error: readError } = await supabase
    .from('runtime_effects')
    .select('id, status, callback_count')
    .eq('id', input.effectId)
    .eq('org_id', input.orgId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!effect) return { found: false, alreadyFinal: false };
  if (effect.status !== 'pending') return { found: true, alreadyFinal: true };

  const { error: updateError } = await supabase
    .from('runtime_effects')
    .update({
      status: input.status,
      result_payload: input.payload as Json,
      callback_count: Number(effect.callback_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.effectId)
    .eq('org_id', input.orgId)
    .eq('status', 'pending');

  if (updateError) throw new Error(updateError.message);
  return { found: true, alreadyFinal: false };
}
