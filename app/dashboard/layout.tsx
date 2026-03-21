import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    redirect("/login");
  }

  return <>{children}</>;
}
