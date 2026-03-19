import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const supabaseAdmin =
  env.nextPublicSupabaseUrl && env.supabaseServiceRoleKey
    ? createClient(env.nextPublicSupabaseUrl, env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;
