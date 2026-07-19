import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { handleApiError } from '../../../../../lib/security/api-errors';

export const dynamic = 'force-dynamic';

// GET /api/admin/sequences/[id] - Get specific sequence
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const { data: sequence } = await supabase
      .from('email_sequences')
      .select(`
        *,
        email_sequence_steps(
          id,
          step_order,
          delay_days,
          email_templates(id, name, subject, body)
        )
      `)
      .eq('id', id)
      .single();

    if (!sequence) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ sequence });
  } catch (err) {
    return handleApiError(err, 'Failed to fetch sequence');
  }
}

// PATCH /api/admin/sequences/[id] - Update sequence
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const updates = await request.json();

    const { data: sequence, error } = await supabase
      .from('email_sequences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sequence });
  } catch (err) {
    return handleApiError(err, 'Failed to update sequence');
  }
}

// DELETE /api/admin/sequences/[id] - Delete sequence
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const { error } = await supabase.from('email_sequences').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'Failed to delete sequence');
  }
}
