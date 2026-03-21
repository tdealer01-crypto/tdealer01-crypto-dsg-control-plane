import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // ดึง user จาก supabase
  const res = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/user",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  )

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const user = await res.json()
  const email = user.email

  // เรียก API ตรวจ active
  const check = await fetch(
    process.env.NEXT_PUBLIC_URL + "/api/check-active",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  )

  const result = await check.json()

  if (!result.active) {
    return NextResponse.redirect(new URL("/pay", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
