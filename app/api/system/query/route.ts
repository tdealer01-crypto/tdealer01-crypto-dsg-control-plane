import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/system/query
 * Natural language queries about system components and dependencies
 *
 * Examples:
 * - "which routes access dsg_runtime_executions table?"
 * - "what does sub_agent_default constraint allow?"
 * - "policy that guards /api/execute?"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, max_depth = 2 } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: "question" is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Parse question to determine search intent
    const question_lower = question.toLowerCase();
    let results: any = { answer: [], dependencies: [], reasoning: [] };

    // Query 1: Routes accessing specific table
    if (question_lower.includes('routes') && question_lower.includes('access') && question_lower.includes('table')) {
      // Safe regex: limit repetition to prevent ReDoS
      const tableMatch = question_lower.match(/table(?:s)?\s+([a-z_]{1,64})|([a-z_]{1,64})\s+table/);
      if (tableMatch) {
        const tableName = tableMatch[1] || tableMatch[2];

        // Find table component
        const { data: tableComp } = await supabase
          .from('dsg_system_components')
          .select('id')
          .eq('path_or_id', tableName)
          .single();

        if (tableComp) {
          // Find dependencies pointing to this table
          const { data: deps } = await supabase
            .from('dsg_component_dependencies')
            .select('from_component_id')
            .eq('to_component_id', tableComp.id);

          if (deps && deps.length > 0) {
            const componentIds = deps.map((d: any) => d.from_component_id);

            // Get component details
            const { data: components } = await supabase
              .from('dsg_system_components')
              .select('*')
              .in('id', componentIds);

            results.answer = components || [];
            results.reasoning.push(`Found ${components?.length || 0} components accessing table "${tableName}"`);
            results.dependencies = deps;
          }
        }
      }
    }

    // Query 2: Constraint set capabilities
    if (question_lower.includes('constraint') && question_lower.includes('allow')) {
      // Safe regex: limit repetition to prevent ReDoS
      const constraintMatch = question_lower.match(/constraint(?:[_\s])+set(?:[_\s])+(?:named\s+)?([a-z_]{1,64})|([a-z_]{1,64})\s+constraint/);
      if (constraintMatch) {
        const constraintName = constraintMatch[1] || constraintMatch[2];

        const { data: constraint } = await supabase
          .from('dsg_constraint_sets')
          .select('*')
          .eq('set_name', constraintName)
          .single();

        if (constraint) {
          results.answer = constraint;
          results.reasoning.push(
            `Constraint set "${constraintName}" allows:`,
            `- Capabilities: ${constraint.allowed_capabilities?.join(', ') || 'none'}`,
            `- Max output tokens: ${constraint.max_tokens_output || 'unlimited'}`,
            `- Max duration: ${constraint.max_duration_seconds || 'unlimited'} seconds`,
            `- Max cost: $${constraint.max_cost_per_execution || 'unlimited'}`
          );
        }
      }
    }

    // Query 3: Policy guarding route
    if (question_lower.includes('policy') && question_lower.includes('guard')) {
      const routeMatch = question_lower.match(/\/api\/[a-z0-9/_-]+/);
      if (routeMatch) {
        const routePath = routeMatch[0];

        // Find route component
        const { data: routeComp } = await supabase
          .from('dsg_system_components')
          .select('id')
          .eq('path_or_id', routePath)
          .single();

        if (routeComp) {
          // Find guarding policies
          const { data: deps } = await supabase
            .from('dsg_component_dependencies')
            .select('from_component_id')
            .eq('to_component_id', routeComp.id)
            .eq('dependency_type', 'guards');

          if (deps && deps.length > 0) {
            const policyIds = deps.map((d: any) => d.from_component_id);

            const { data: policies } = await supabase
              .from('dsg_system_components')
              .select('*')
              .in('id', policyIds);

            results.answer = policies || [];
            results.reasoning.push(`Found ${policies?.length || 0} policies guarding route "${routePath}"`);
          }
        }
      }
    }

    // Fallback: Return all active components if no specific match
    if (results.answer.length === 0) {
      const { data: components } = await supabase
        .from('dsg_system_components')
        .select('*')
        .eq('status', 'active')
        .limit(20);

      results.answer = components || [];
      results.reasoning.push(
        'Could not parse specific query.',
        `Returning ${components?.length || 0} active components as reference.`,
        'Try asking: "which routes access table X?" or "policy that guards /api/execute?"'
      );
    }

    return NextResponse.json({
      ok: true,
      question,
      question_understood: results.answer.length > 0,
      answer: results.answer,
      reasoning: results.reasoning,
      dependencies: results.dependencies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/system/query', error);
  }
}
