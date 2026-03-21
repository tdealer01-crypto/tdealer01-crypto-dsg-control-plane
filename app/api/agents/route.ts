import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("org_id", profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const body = await req.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data, error } = await supabase
      .from("agents")
      .insert([
        {
          name: body.name,
          policy_id: body.policy_id,
          monthly_limit: body.monthly_limit,
          org_id: profile?.org_id,
          owner_user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
