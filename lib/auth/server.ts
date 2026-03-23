import { NextResponse } from "next/server";

import { createClient } from "../supabase/server";
import { getSupabaseAdmin } from "../supabase-server";

export type AuthenticatedProfile = {
  auth_user_id?: string | null;
  org_id: string;
  is_active: boolean;
  email: string | null;
};

type EnsureUserInput = {
  id: string;
  email?: string | null;
};

export async function ensureUserProfile(
  user: EnsureUserInput
): Promise<AuthenticatedProfile> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("users")
    .select("auth_user_id, org_id, is_active, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.org_id) {
    return existing as AuthenticatedProfile;
  }

  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        auth_user_id: user.id,
        email: user.email ?? null,
        org_id: "org_demo",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "auth_user_id" }
    )
    .select("auth_user_id, org_id, is_active, email")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to create user profile");
  }

  return inserted as AuthenticatedProfile;
}

export async function getApiAuthContext() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const profile = await ensureUserProfile({
      id: user.id,
      email: user.email,
    });

    if (!profile.org_id || !profile.is_active) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      ok: true as const,
      supabase,
      user,
      profile,
    };
  } catch (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to resolve user profile",
        },
        { status: 403 }
      ),
    };
  }
}
