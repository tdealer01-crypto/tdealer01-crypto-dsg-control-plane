import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function middleware(req: any) {
const token = req.cookies.get("sb-access-token")?.value

if (!token) {
return NextResponse.redirect(new URL("/login", req.url))
}

const userRes = await fetch(
process.env.SUPABASE_URL + "/auth/v1/user",
{
headers: {
Authorization: "Bearer ${token}",
apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
}
}
)

if (!userRes.ok) {
return NextResponse.redirect(new URL("/login", req.url))
}

const user = await userRes.json()
const email = user.email

const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data } = await supabase
.from("users")
.select("is_active")
.eq("email", email)
.single()

if (!data?.is_active) {
return NextResponse.redirect(new URL("/pay", req.url))
}

return NextResponse.next()
}

export const config = {
matcher: ["/dashboard/:path*"]
}
