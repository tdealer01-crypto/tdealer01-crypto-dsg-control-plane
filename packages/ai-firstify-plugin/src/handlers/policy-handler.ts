import type { Context } from 'hono';
import type { GovernancePolicy } from '../lib/types';

// In-memory storage for demo purposes
const policies: Map<string, GovernancePolicy> = new Map();

export async function createPolicy(c: Context) {
  try {
    const body = (await c.req.json()) as Partial<GovernancePolicy>;

    if (!body.name || !body.rules || body.rules.length === 0) {
      return c.json(
        {
          error: 'Missing required fields: name, rules',
        },
        400
      );
    }

    const policy: GovernancePolicy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description || '',
      rules: body.rules,
      riskLevel: body.riskLevel || 'medium',
      enabled: body.enabled !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    policies.set(policy.id, policy);

    return c.json(policy, 201);
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
    const policyList = Array.from(policies.values());
    return c.json({ policies: policyList });
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
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    const policy = policies.get(id);

    if (!policy) {
      return c.json({ error: 'Policy not found' }, 404);
    }

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
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    const existingPolicy = policies.get(id);

    if (!existingPolicy) {
      return c.json({ error: 'Policy not found' }, 404);
    }

    const body = (await c.req.json()) as Partial<GovernancePolicy>;

    const updatedPolicy: GovernancePolicy = {
      ...existingPolicy,
      ...body,
      id: existingPolicy.id,
      createdAt: existingPolicy.createdAt,
      updatedAt: new Date(),
    };

    policies.set(id, updatedPolicy);

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
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    if (!policies.has(id)) {
      return c.json({ error: 'Policy not found' }, 404);
    }

    policies.delete(id);

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
