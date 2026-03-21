import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const { email } = await req.json()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from("users")
    .select("is_active")
    .eq("email", email)
    .single()

  return NextResponse.json({
    active: data?.is_active === true
  })
}
