import { getSupabaseAdmin } from '../supabase-server';
import { sha256Hex } from './canonical';
import type { TruthState } from './gate';

export const CHECKPOINT_INTERVAL = 25;

export function hashTruthState(state: TruthState): string {
  return sha256Hex({
    epoch: state.epoch,
    sequence: state.sequence,
    v_t: state.v_t,
    t_t: state.t_t,
    g_t: state.g_t,
    i_t: state.i_t,
    s_star_hash: state.s_star_hash,
  });
}

export async function maybeWriteCheckpoint(params: {
  orgId: string;
  sequence: number;
  epoch: number;
  entryHash: string;
  truthState: TruthState;
  force?: boolean;
}) {
  const shouldWrite = params.force || params.sequence === 0 || params.sequence % CHECKPOINT_INTERVAL === 0;
  if (!shouldWrite) {
    return { written: false };
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('state_checkpoints')
    .upsert(
      {
        org_id: params.orgId,
        sequence: params.sequence,
        epoch: params.epoch,
        state_hash: hashTruthState(params.truthState),
        entry_hash: params.entryHash,
        snapshot: {
          epoch: params.truthState.epoch,
          sequence: params.truthState.sequence,
          v_t: params.truthState.v_t,
          t_t: params.truthState.t_t,
          g_t: params.truthState.g_t,
          i_t: params.truthState.i_t,
          s_star_hash: params.truthState.s_star_hash,
        },
        created_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,sequence' }
    );

  if (error) {
    throw new Error(error.message);
  }

  return { written: true };
}
