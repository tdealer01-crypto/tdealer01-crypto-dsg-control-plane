import { describe, expect, it } from 'vitest';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeLive = hasEnv ? describe : describe.skip;

describeLive('audit evidence fields', () => {
  it('action events contain required audit fields', async () => {
    const supabase = getSupabaseAdmin() as any;
    const { data } = await supabase
      .from('finance_workflow_action_events')
      .select('action, actor, result, target, created_at')
      .limit(1);

    if (data && data.length > 0) {
      const e = data[0];
      expect(e.action).toBeTruthy();
      expect(e.actor).toBeTruthy();
      expect(e.result).toBeTruthy();
      expect(e.target).toBeTruthy();
      expect(e.created_at).toBeTruthy();
    }
  });
});
