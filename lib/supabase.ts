import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^['"]|['"]$/g, "");
}

export function getSupabaseBrowserConfig() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url) {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_SUPABASE_URL is empty",
      url,
      anonKey,
    };
  }

  if (!anonKey) {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY is empty",
      url,
      anonKey,
    };
  }

  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return {
        ok: false,
        reason: "NEXT_PUBLIC_SUPABASE_URL is not http/https",
        url,
        anonKey,
      };
    }
  } catch {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_SUPABASE_URL is not a valid URL",
      url,
      anonKey,
    };
  }

  return {
    ok: true,
    reason: "",
    url,
    anonKey,
  };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseBrowserConfig();

  if (!config.ok) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(config.url, config.anonKey);
  }

  return browserClient;
}
