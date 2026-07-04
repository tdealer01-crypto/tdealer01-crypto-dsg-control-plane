import { getSupabaseAdmin } from '../supabase-server';
import { syncMarketplaceSubscription } from './subscription-sync';

export type LinkGithubMarketplaceAccountInput = {
  orgId: string;
  githubAccountId: number;
  githubLogin: string;
  installationId?: number | null;
};

/**
 * Links a GitHub Marketplace buyer account to an internal org, then
 * replays the most recent marketplace_events row for that account (if
 * any) so a purchase that arrived before the org existed isn't lost —
 * see the "stays logged ... can be replayed" comment in
 * app/api/webhooks/marketplace/route.ts.
 */
export async function linkGithubMarketplaceAccount(input: LinkGithubMarketplaceAccountInput) {
  const admin = getSupabaseAdmin() as any;
  const nowIso = new Date().toISOString();

  const { error: linkError } = await admin.from('marketplace_account_links').upsert(
    {
      github_account_id: input.githubAccountId,
      github_login: input.githubLogin,
      org_id: input.orgId,
      installation_id: input.installationId ?? null,
      updated_at: nowIso,
    },
    { onConflict: 'github_account_id' },
  );

  if (linkError) {
    return { linked: false, replayed: false, reason: `link upsert failed: ${linkError.message}` };
  }

  const { data: latestEvent, error: eventError } = await admin
    .from('marketplace_events')
    .select('action, plan_name, billing_cycle')
    .eq('github_account_id', input.githubAccountId)
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError || !latestEvent) {
    return { linked: true, replayed: false, reason: eventError?.message || 'no prior marketplace event' };
  }

  const sync = await syncMarketplaceSubscription({
    action: latestEvent.action,
    githubAccountId: input.githubAccountId,
    githubLogin: input.githubLogin,
    planName: latestEvent.plan_name,
    billingCycle: latestEvent.billing_cycle,
  });

  return { linked: true, replayed: sync.applied, sync };
}
