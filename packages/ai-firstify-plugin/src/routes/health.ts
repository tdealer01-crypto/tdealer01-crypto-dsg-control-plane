import { Hono } from 'hono';
import { createDSGClient } from '../lib/dsg-client';
import { getConfig } from '../lib/config';

const router = new Hono();

router.get('/', async (c) => {
  try {
    const config = getConfig();
    const dsgClient = createDSGClient(config.apiBase, config.apiKey);

    // Check DSG connection
    const dsgHealth = await dsgClient.getHealth();

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dsg: dsgHealth,
    });
  } catch (error) {
    return c.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503
    );
  }
});

export default router;
