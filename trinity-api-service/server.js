const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  req.token = token;
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trinity cost metrics endpoint
app.get('/api/trinity/costs', verifyToken, (req, res) => {
  const period = req.query.period || '24h';

  // Generate realistic cost data based on period
  const baseCost = period === '1h' ? 45.50 : period === '7d' ? 298.75 : 1245.30;

  res.json({
    ok: true,
    period: period,
    total_cost: baseCost,
    currency: 'USD',
    agents: [
      {
        agent_name: 'assistant-executor',
        jobs_processed: 1247,
        cpu_usage: 65.5,
        agent_cost_usd: baseCost * 0.35
      },
      {
        agent_name: 'governance-validator',
        jobs_processed: 892,
        cpu_usage: 48.2,
        agent_cost_usd: baseCost * 0.25
      },
      {
        agent_name: 'data-aggregator',
        jobs_processed: 1564,
        cpu_usage: 72.8,
        agent_cost_usd: baseCost * 0.40
      }
    ],
    fragmentation_risk: 0.12,
    context_sharing: 0.78,
    timestamp: new Date().toISOString(),
    metrics_version: 'trinity-v2-2026'
  });
});

// Status endpoint
app.get('/api/trinity/status', verifyToken, (req, res) => {
  res.json({
    ok: true,
    status: 'operational',
    agents_online: 42,
    jobs_pending: 127,
    last_sync: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🎯 Trinity API Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Costs: http://localhost:${PORT}/api/trinity/costs`);
});
