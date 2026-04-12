import { getSupabaseAdmin } from '../supabase-server';

export function getAdminDb() {
  return getSupabaseAdmin() as any;
}
