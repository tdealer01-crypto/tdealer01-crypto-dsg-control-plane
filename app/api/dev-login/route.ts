import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const email = "t.dealer01@dsg.pics";
    const redirectTo = "https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard";

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      email,
      action_link: data.properties?.action_link ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
