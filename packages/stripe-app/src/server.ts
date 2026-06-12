/**
 * Stripe App Server Configuration
 *
 * Initializes the Hono application with all required routes and middleware.
 * Uses Vercel Edge Functions where possible to minimize cold-start latency.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import webhookRouter from './routes/webhooks';
import policiesRouter from './routes/policies';
import auditRouter from './routes/audit';
import customUIRouter from './routes/custom-ui';
import oauthRouter from './routes/oauth';
import approvalsRouter from './routes/approvals';

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
 * - GET/POST /stripe/approvals/* - Approval workflow
 * - POST /stripe/oauth/* - OAuth flows
 */
export function initializeStripeApp(): Hono {
  const app = new Hono();

  // Global middleware
  app.use(
    '*',
    cors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
      credentials: true,
    })
  );

  // Request logging middleware
  app.use('*', logger());

  // Error handling middleware
  app.onError((err, c) => {
    console.error('Error:', err);
    return c.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register routers
  app.route('/webhook', webhookRouter);
  app.route('/custom-ui', customUIRouter);
  app.route('/policies', policiesRouter);
  app.route('/audit', auditRouter);
  app.route('/approvals', approvalsRouter);
  app.route('/oauth', oauthRouter);

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  return app;
}

export default initializeStripeApp;
