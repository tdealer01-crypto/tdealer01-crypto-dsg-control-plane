import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { claims },
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claims?.sub) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, auth_user_id, org_id, email, role, is_active")
    .eq("auth_user_id", claims.sub)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !profile.org_id
  ) {
    redirect("/login");
  }

  return <>{children}</>;
}
