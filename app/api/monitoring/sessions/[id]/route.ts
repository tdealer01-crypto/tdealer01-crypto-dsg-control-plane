/**
 * GET /api/monitoring/sessions/[id]
 * Get complete execution detail including all events and tool calls
 *
 * Path Parameters:
 * - id: execution_id (UUID)
 *
 * Returns:
 * - execution: full execution record
 * - events: all events for this execution
 * - toolCalls: all tool calls for this execution
 * - tokens: all token usage records
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('monitoring_executions')
      .select('*')
      .eq('execution_id', id)
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get events
    const { data: events } = await supabase
      .from('monitoring_events')
      .select('*')
      .eq('execution_id', id)
      .order('timestamp', { ascending: true });

    // Get tool calls
    const { data: toolCalls } = await supabase
      .from('monitoring_tool_calls')
      .select('*')
      .eq('execution_id', id)
      .order('started_at', { ascending: true });

    // Get token usage
    const { data: tokens } = await supabase
      .from('monitoring_token_usage')
      .select('*')
      .eq('execution_id', id)
      .order('timestamp', { ascending: true });

    // Build transcript from events and tool calls
    const transcript = buildTranscript(events || [], toolCalls || []);

    return NextResponse.json({
      execution,
      events: events || [],
      toolCalls: toolCalls || [],
      tokens: tokens || [],
      transcript,
    });
  } catch (error) {
    console.error('Error in GET /api/monitoring/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build a transcript from events and tool calls
 */
function buildTranscript(
  events: any[],
  toolCalls: any[]
): Array<{ type: string; timestamp: string; content: string }> {
  const items: Array<{ type: string; timestamp: string; content: string }> = [];

  // Add events
  events.forEach((event) => {
    if (event.event_type === 'execution_start') {
      items.push({
        type: 'event',
        timestamp: event.timestamp,
        content: `Execution started`,
      });
    } else if (event.event_type === 'execution_end') {
      items.push({
        type: 'event',
        timestamp: event.timestamp,
        content: `Execution completed with status: ${event.metadata?.status || 'unknown'}`,
      });
    }
  });

  // Add tool calls
  toolCalls.forEach((toolCall) => {
    items.push({
      type: 'tool_call',
      timestamp: toolCall.started_at,
      content: `Called ${toolCall.tool_name} (${toolCall.risk_level} risk, ${toolCall.approval_status})`,
    });
  });

  // Sort by timestamp
  items.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return items;
}
