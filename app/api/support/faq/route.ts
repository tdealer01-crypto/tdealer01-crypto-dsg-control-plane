import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

// GET /api/support/faq — get all published FAQ entries for user's org
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get published FAQ entries
    const { data: entries, error: fetchError } = await (supabase as any)
      .from('faq_entries')
      .select('id, question, answer, category, created_at')
      .eq('org_id', userProfile.org_id)
      .eq('is_published', true)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ ok: true, entries });
  } catch (err) {
    logApiError('api/support/faq GET', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// POST /api/support/faq — create a new FAQ entry (admin only)
export async function POST(request: Request) {
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
    const { question, answer, category, search_keywords } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!question?.trim()) {
      errors.question = 'Question is required';
    } else if (question.trim().length < 5) {
      errors.question = 'Question must be at least 5 characters';
    }

    if (!answer?.trim()) {
      errors.answer = 'Answer is required';
    } else if (answer.trim().length < 10) {
      errors.answer = 'Answer must be at least 10 characters';
    }

    if (!category?.trim()) {
      errors.category = 'Category is required';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Create entry
    const { data: entry, error: insertError } = await (supabase as any)
      .from('faq_entries')
      .insert({
        org_id: userProfile.org_id,
        created_by: userProfile.id,
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim(),
        search_keywords: search_keywords?.trim(),
        is_published: true,
        order_index: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { ok: true, entry, message: 'FAQ entry created' },
      { status: 201 }
    );
  } catch (err) {
    logApiError('api/support/faq POST', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
