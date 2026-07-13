import type { Context } from 'hono';
import { createDSGClient } from '../lib/dsg-client';
import { getConfig } from '../lib/config';
import type { GovernanceRequest } from '../lib/types';

export async function handleGovernanceRequest(c: Context) {
  try {
    const config = getConfig();
    const dsgClient = createDSGClient(config.apiBase, config.apiKey);

    const body = (await c.req.json()) as GovernanceRequest;

    // Validate request
    if (!body.modelId || !body.action) {
      return c.json(
        {
          error: 'Missing required fields: modelId, action',
        },
        400
      );
    }

    // Evaluate governance
    const decision = await dsgClient.evaluateGovernance(body);

    return c.json(decision);
  } catch (error) {
    console.error('Governance handler error:', error);
    return c.json(
      {
        error: 'Failed to evaluate governance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function handlePolicyManifest(c: Context) {
  try {
    const config = getConfig();
    const dsgClient = createDSGClient(config.apiBase, config.apiKey);

    const manifest = await dsgClient.getPolicyManifest();
    return c.json(manifest);
  } catch (error) {
    console.error('Policy manifest handler error:', error);
    return c.json(
      {
        error: 'Failed to fetch policy manifest',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
