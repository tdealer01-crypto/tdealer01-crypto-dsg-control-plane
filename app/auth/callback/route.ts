import { NextResponse } from "next/server";

import { ensureUserProfile } from "../../../lib/auth/server";
import { createClient } from "../../../lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) return "/dashboard";
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("next", nextPath);

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    loginUrl.searchParams.set("error", "Missing auth code");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      loginUrl.searchParams.set("error", userError?.message || "Missing authenticated user");
      return NextResponse.redirect(loginUrl);
    }

    await ensureUserProfile({
      id: user.id,
      email: user.email,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    loginUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Authentication failed"
    );
    return NextResponse.redirect(loginUrl);
  }
}
