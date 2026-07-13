import type { Context } from 'hono';
import { getSupabaseClient } from '../lib/supabase-client';
import type { GovernancePolicy, PolicyRule } from '../lib/types';

export async function createPolicy(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const body = (await c.req.json()) as Partial<GovernancePolicy> & {
      orgId?: string;
      createdBy?: string;
    };

    const orgId = body.orgId || c.req.header('x-org-id');
    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    if (!body.name || !body.rules || body.rules.length === 0) {
      return c.json(
        {
          error: 'Missing required fields: name, rules',
        },
        400
      );
    }

    const { data, error } = await supabase
      .from('ai_policies')
      .insert({
        org_id: orgId,
        name: body.name,
        description: body.description || null,
        policy_type: 'governance',
        rules: JSON.stringify(body.rules),
        risk_level: body.riskLevel || 'medium',
        enabled: body.enabled !== false,
        version: 1,
        created_by: body.createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to create policy', details: error.message }, 500);
    }

    return c.json({
      id: data.id,
      name: data.name,
      description: data.description,
      rules: JSON.parse(data.rules as string),
      riskLevel: data.risk_level,
      enabled: data.enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }, 201);
  } catch (error) {
    console.error('Policy creation error:', error);
    return c.json(
      {
        error: 'Failed to create policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function listPolicies(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const orgId = c.req.header('x-org-id');

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const { data, error } = await supabase
      .from('ai_policies')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to list policies', details: error.message }, 500);
    }

    const policies = data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rules: JSON.parse(row.rules as string) as PolicyRule[],
      riskLevel: row.risk_level as GovernancePolicy['riskLevel'],
      enabled: row.enabled,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return c.json({ policies });
  } catch (error) {
    console.error('Policy listing error:', error);
    return c.json(
      {
        error: 'Failed to list policies',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function getPolicy(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const orgId = c.req.header('x-org-id');

    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const { data, error } = await supabase
      .from('ai_policies')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Policy not found' }, 404);
    }

    const policy: GovernancePolicy = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      rules: JSON.parse(data.rules as string) as PolicyRule[],
      riskLevel: data.risk_level as GovernancePolicy['riskLevel'],
      enabled: data.enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    return c.json(policy);
  } catch (error) {
    console.error('Policy retrieval error:', error);
    return c.json(
      {
        error: 'Failed to retrieve policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function updatePolicy(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const orgId = c.req.header('x-org-id');

    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const body = (await c.req.json()) as Partial<GovernancePolicy>;

    const { data, error } = await supabase
      .from('ai_policies')
      .update({
        name: body.name,
        description: body.description,
        rules: body.rules ? JSON.stringify(body.rules) : undefined,
        risk_level: body.riskLevel,
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Policy not found' }, 404);
    }

    const updatedPolicy: GovernancePolicy = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      rules: JSON.parse(data.rules as string) as PolicyRule[],
      riskLevel: data.risk_level as GovernancePolicy['riskLevel'],
      enabled: data.enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    return c.json(updatedPolicy);
  } catch (error) {
    console.error('Policy update error:', error);
    return c.json(
      {
        error: 'Failed to update policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function deletePolicy(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const orgId = c.req.header('x-org-id');

    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const { error } = await supabase
      .from('ai_policies')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to delete policy', details: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Policy deletion error:', error);
    return c.json(
      {
        error: 'Failed to delete policy',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
