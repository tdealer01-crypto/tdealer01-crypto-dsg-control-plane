import { headers } from 'next/headers';
import { getSupabaseAdmin } from '../supabase-server';
import type { Json } from '../database.types';

export type SignInEventType = 'magic_link_requested' | 'magic_link_verified' | 'request_access_submitted' | 'sign_out';

export async function logSignInEvent(input: {
  email: string;
  eventType: SignInEventType;
  orgId?: string | null;
  authUserId?: string | null;
  source?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const hdrs = await headers();
  const ipAddress = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = hdrs.get('user-agent');

  const admin = getSupabaseAdmin();
  await admin.from('sign_in_events').insert({
    email: input.email.trim().toLowerCase(),
    org_id: input.orgId || null,
    auth_user_id: input.authUserId || null,
    event_type: input.eventType,
    source: input.source || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    success: input.success ?? true,
    metadata: (input.metadata || {}) as Json,
  });
}
