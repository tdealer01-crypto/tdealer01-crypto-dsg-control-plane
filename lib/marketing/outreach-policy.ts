/**
 * Outbound-email policy for the marketing agent.
 *
 * MARKETING_OUTREACH_MODE controls every automated cold/followup send:
 *   'off'   — no outbound email at all
 *   'queue' — agent drafts land in `outreach_approvals` for a human to approve
 *             (default: no email leaves without founder sign-off)
 *   'auto'  — agent sends immediately (opt-in via env, no deploy needed)
 */

export type OutreachMode = 'off' | 'queue' | 'auto';

export function getOutreachMode(): OutreachMode {
  const raw = (process.env.MARKETING_OUTREACH_MODE ?? 'queue').trim().toLowerCase();
  if (raw === 'auto' || raw === 'off' || raw === 'queue') return raw;
  return 'queue';
}
