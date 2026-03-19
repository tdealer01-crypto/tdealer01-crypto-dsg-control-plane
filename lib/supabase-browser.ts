import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const supabaseBrowser =
  env.nextPublicSupabaseUrl && env.nextPublicSupabaseAnonKey
    ? createClient(env.nextPublicSupabaseUrl, env.nextPublicSupabaseAnonKey)
    : null;
