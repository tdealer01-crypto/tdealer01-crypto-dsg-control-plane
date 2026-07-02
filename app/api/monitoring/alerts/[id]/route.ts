/**
 * PATCH /api/monitoring/alerts/[id] - Update alert status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const alertId = params.id;
    const supabase = await createClient();
    const body = await request.json();

    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    if (!['new', 'acknowledged', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: new, acknowledged, resolved' },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
    } else if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('monitoring_alerts')
      .update(updateData)
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update alert:', error);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
