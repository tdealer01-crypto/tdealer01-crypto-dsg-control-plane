import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

export async function getUser() {
  const cookieStore = cookies()
  const token = cookieStore.get("sb-access-token")?.value

  if (!token) return null

  const res = await fetch(
    process.env.SUPABASE_URL + "/auth/v1/user",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apiKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  )

  if (!res.ok) return null

  return res.json()
}
