/**
 * PATCH /api/monitoring/webhooks/[id] - Update webhook
 * DELETE /api/monitoring/webhooks/[id] - Delete webhook
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
    const webhookId = params.id;
    const supabase = await createClient();
    const body = await request.json();

    const { url, channel, secret, enabled } = body;

    const updateData: any = {};

    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    if (channel !== undefined) {
      if (!['slack', 'discord', 'generic'].includes(channel)) {
        return NextResponse.json(
          { error: 'Invalid channel. Must be one of: slack, discord, generic' },
          { status: 400 }
        );
      }
      updateData.channel = channel;
    }

    if (secret !== undefined) {
      updateData.secret = secret;
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('monitoring_webhooks')
      .update(updateData)
      .eq('webhook_id', webhookId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update webhook:', error);
      return NextResponse.json(
        { error: 'Failed to update webhook' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const webhookId = params.id;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('monitoring_webhooks')
      .delete()
      .eq('webhook_id', webhookId)
      .select()
      .single();

    if (error) {
      console.error('Failed to delete webhook:', error);
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
