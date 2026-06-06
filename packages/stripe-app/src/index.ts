/**
 * DSG Stripe App - Main Entry Point
 *
 * This is the root module for the DSG Governance Gate Stripe App.
 * It exports the configured Hono application that serves as the
 * Stripe App backend for webhook handling and API endpoints.
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

import { initializeStripeApp } from './server';

// Create the Hono application
const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      'https://dashboard.stripe.com',
      'https://dashboard-test.stripe.com',
      process.env.STRIPE_APP_ORIGIN || 'http://localhost:3001',
    ],
    credentials: true,
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Initialize Stripe App routes
const stripeApp = initializeStripeApp();
app.route('/stripe', stripeApp);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

export default app;

// Export for Stripe CLI and testing
export { app };
