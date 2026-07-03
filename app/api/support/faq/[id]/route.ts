import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

// PATCH /api/support/faq/[id] — update FAQ entry
export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { question, answer, category, is_published } = body;

    // Update entry
    const { data: entry, error: updateError } = await (supabase as any)
      .from('faq_entries')
      .update({
        question: question?.trim(),
        answer: answer?.trim(),
        category: category?.trim(),
        is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', userProfile.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    logApiError('api/support/faq/[id] PATCH', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// DELETE /api/support/faq/[id] — delete FAQ entry
export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete entry
    const { error: deleteError } = await (supabase as any)
      .from('faq_entries')
      .delete()
      .eq('id', id)
      .eq('created_by', userProfile.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Entry deleted' });
  } catch (err) {
    logApiError('api/support/faq/[id] DELETE', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
