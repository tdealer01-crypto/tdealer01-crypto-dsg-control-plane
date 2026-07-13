import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import governanceRoutes from './routes/governance';
import policyRoutes from './routes/policy';
import auditRoutes from './routes/audit';
import healthRoutes from './routes/health';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'https://dsg.pics',
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    allowHeaders: ['Content-Type', 'Authorization', 'X-DSG-API-Key'],
    credentials: true,
  })
);

// Routes
app.route('/health', healthRoutes);
app.route('/api/v1/governance', governanceRoutes);
app.route('/api/v1/policies', policyRoutes);
app.route('/api/v1/audit', auditRoutes);

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'DSG AI-Firstify Plugin',
    version: '0.1.0',
    status: 'running',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : 'Unknown error',
    },
    500
  );
});

export { app };
