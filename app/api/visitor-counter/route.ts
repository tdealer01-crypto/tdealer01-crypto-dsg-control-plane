import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        ok: false,
        count: 0,
        error: 'Database not configured',
      }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create visitor counter record
    const { data: records, error: readError } = await supabase
      .from('visitor_counters')
      .select('count')
      .eq('page', 'hello-thanawat')
      .single();

    if (readError && readError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw readError;
    }

    const currentCount = records?.count ?? 0;
    const newCount = currentCount + 1;

    // Update counter
    if (records) {
      await supabase
        .from('visitor_counters')
        .update({ count: newCount, updated_at: new Date().toISOString() })
        .eq('page', 'hello-thanawat');
    } else {
      await supabase
        .from('visitor_counters')
        .insert({
          page: 'hello-thanawat',
          count: newCount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      ok: true,
      count: newCount,
      page: 'hello-thanawat',
    });
  } catch (error) {
    console.error('[visitor-counter] Error:', error);
    return NextResponse.json({
      ok: false,
      count: 0,
      error: String(error),
    }, { status: 500 });
  }
}
