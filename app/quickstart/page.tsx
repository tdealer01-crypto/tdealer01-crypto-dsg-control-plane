import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function QuickstartRedirectPage() {
  redirect("/dashboard/skills?source=quickstart");
}
