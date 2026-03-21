import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return null;
    }
  } catch {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}
