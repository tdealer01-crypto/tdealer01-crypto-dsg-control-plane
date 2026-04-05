import { createClient } from '../../../../lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return Response.json({
      authenticated: Boolean(user),
      email: user?.email ?? null,
    });
  } catch {
    return Response.json({
      authenticated: false,
      email: null,
    });
  }
}
