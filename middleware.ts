import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

function buildLoginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

function isProtectedDashboardPath(pathname: string) {
  return pathname.startsWith("/dashboard");
}

function isProtectedApiPath(pathname: string) {
  return (
    pathname === "/api/agents" ||
    pathname === "/api/metrics" ||
    pathname === "/api/usage" ||
    pathname.startsWith("/api/executions") ||
    pathname.startsWith("/api/audit")
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { claims },
  } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  const hasSession = Boolean(claims);

  if (pathname === "/login" && hasSession) {
    const next = request.nextUrl.searchParams.get("next");
    const redirectTo = new URL(next && next.startsWith("/") ? next : "/dashboard", request.url);
    return NextResponse.redirect(redirectTo);
  }

  if (isProtectedDashboardPath(pathname) && !hasSession) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  if (isProtectedApiPath(pathname) && !hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/api/agents",
    "/api/metrics",
    "/api/usage",
    "/api/executions/:path*",
    "/api/audit/:path*",
  ],
};
