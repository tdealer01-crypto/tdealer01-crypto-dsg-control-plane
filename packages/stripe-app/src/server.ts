/**
 * Stripe App Server Configuration
 *
 * Initializes the Hono application with all required routes and middleware.
 * Uses Vercel Edge Functions where possible to minimize cold-start latency.
 */

import { Hono } from 'hono';
import { serve } from 'hono/node';

import webhookRouter from './routes/webhooks';
import policiesRouter from './routes/policies';
import auditRouter from './routes/audit';
import customUIRouter from './routes/custom-ui';
import oauthRouter from './routes/oauth';

/**
 * Initialize the Stripe App with all route handlers.
 *
 * Structure:
 * - POST /stripe/webhook/events - Webhook event handler (Edge Function)
 * - POST /stripe/webhook/install - OAuth callback
 * - POST /stripe/webhook/uninstall - App uninstall
 * - POST /stripe/custom-ui/execute - Pre-execution gate for UI actions
 * - GET/POST /stripe/policies/* - Policy management
 * - GET /stripe/audit/* - Audit trail queries
 * - POST /stripe/oauth/* - OAuth flows
 */
export function initializeStripeApp(): Hono {
  const app = new Hono();

  // Register routers
  app.route('/webhook', webhookRouter);
  app.route('/custom-ui', customUIRouter);
  app.route('/policies', policiesRouter);
  app.route('/audit', auditRouter);
  app.route('/oauth', oauthRouter);

  return app;
}

// Start server if running as CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = initializeStripeApp();

  const port = parseInt(process.env.PORT || '3001', 10);
  console.log(`🚀 Stripe App server running on http://localhost:${port}`);

  serve({ fetch: app.fetch, port });
}

export default initializeStripeApp();
