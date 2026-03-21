import { createClient } from "@supabase/supabase-js"

export async function checkActive(email: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("users")
    .select("is_active")
    .eq("email", email)
    .single()

  if (error) return false

  return data?.is_active === true
}
