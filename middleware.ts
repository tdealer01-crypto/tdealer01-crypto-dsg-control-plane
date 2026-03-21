import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isProtectedDashboard(pathname: string) {
  return pathname.startsWith("/dashboard");
}

function isProtectedApi(pathname: string) {
  return (
    pathname === "/api/agents" ||
    pathname === "/api/executions" ||
    pathname === "/api/usage"
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { claims },
  } = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;
  const loggedIn = !!claims?.sub;

  if (isProtectedDashboard(pathname) && !loggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedApi(pathname) && !loggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/agents",
    "/api/executions",
    "/api/usage",
  ],
};
