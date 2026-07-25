import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/system/validate-spawn
 * Validates if a proposed agent spawn complies with constraints
 *
 * Body:
 * {
 *   "agent_spec": {
 *     "role": "code-reviewer",
 *     "tools": ["bash.execute", "file.read"],
 *     "max_tokens": 8192,
 *     "max_duration_seconds": 1800
 *   },
 *   "constraint_set_name": "sub_agent_default"
 * }
 *
 * Returns:
 * {
 *   "valid": boolean,
 *   "violations": [...violations if any],
 *   "allowed_by": constraint_set_object,
 *   "cost_estimate": decimal
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_spec, constraint_set_name } = body;

    if (!agent_spec || !constraint_set_name) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_spec, constraint_set_name' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Fetch constraint set
    const { data: constraint, error: constraintError } = await supabase
      .from('dsg_constraint_sets')
      .select('*')
      .eq('set_name', constraint_set_name)
      .single();

    if (constraintError || !constraint) {
      return NextResponse.json(
        { error: `Constraint set "${constraint_set_name}" not found` },
        { status: 404 }
      );
    }

    const violations: string[] = [];
    let costEstimate = 0;

    // =========================================================================
    // VALIDATION 1: Tool allowance
    // =========================================================================
    if (agent_spec.tools && Array.isArray(agent_spec.tools)) {
      const allowedTools = constraint.allowed_capabilities || [];

      for (const tool of agent_spec.tools) {
        if (!allowedTools.includes(tool)) {
          violations.push(`Tool "${tool}" not allowed by constraint set`);
        }
      }
    }

    // =========================================================================
    // VALIDATION 2: Token limit
    // =========================================================================
    if (agent_spec.max_tokens && constraint.max_tokens_output) {
      if (agent_spec.max_tokens > constraint.max_tokens_output) {
        violations.push(
          `Max tokens ${agent_spec.max_tokens} exceeds constraint limit ${constraint.max_tokens_output}`
        );
      }
    }

    // =========================================================================
    // VALIDATION 3: Duration limit
    // =========================================================================
    if (agent_spec.max_duration_seconds && constraint.max_duration_seconds) {
      if (agent_spec.max_duration_seconds > constraint.max_duration_seconds) {
        violations.push(
          `Max duration ${agent_spec.max_duration_seconds}s exceeds constraint limit ${constraint.max_duration_seconds}s`
        );
      }
    }

    // =========================================================================
    // VALIDATION 4: Cost estimate
    // =========================================================================
    if (constraint.max_cost_per_execution) {
      // Simple cost model: base cost + per-tool cost
      costEstimate = 0.01; // base

      if (agent_spec.tools && Array.isArray(agent_spec.tools)) {
        costEstimate += agent_spec.tools.length * 0.001;
      }

      if (costEstimate > Number(constraint.max_cost_per_execution)) {
        violations.push(
          `Estimated cost $${costEstimate.toFixed(4)} exceeds constraint limit $${Number(constraint.max_cost_per_execution).toFixed(4)}`
        );
      }
    }

    // =========================================================================
    // VALIDATION 5: Role requirement
    // =========================================================================
    if (constraint.requires_org_owner_role && !body.user_has_owner_role) {
      violations.push('Organization owner role required to spawn agent');
    }

    const isValid = violations.length === 0;

    return NextResponse.json({
      ok: true,
      valid: isValid,
      violations,
      allowed_by: {
        name: constraint.set_name,
        description: constraint.description,
        allowed_capabilities: constraint.allowed_capabilities,
        max_tokens_output: constraint.max_tokens_output,
        max_duration_seconds: constraint.max_duration_seconds,
        max_cost_per_execution: constraint.max_cost_per_execution,
      },
      cost_estimate: costEstimate,
      requires_approval: !isValid || constraint.requires_human_approval,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/system/validate-spawn', error);
  }
}
