import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectTo = new URL('/login', request.url);
  redirectTo.searchParams.set('message', 'signed-out');
  return NextResponse.redirect(redirectTo, { status: 302 });
}
