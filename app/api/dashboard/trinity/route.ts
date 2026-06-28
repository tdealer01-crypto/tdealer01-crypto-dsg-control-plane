import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface MarketplaceData {
  profiles: Array<{
    agentId: string;
    reputation: number;
    totalEarnings: number;
    completedJobs: number;
    tier: string;
  }>;
  executions: Array<{
    jobId: string;
    status: string;
    qualityScore?: number;
  }>;
  earnings: Array<{
    jobId: string;
    amount: number;
    timestamp: string;
  }>;
}

function loadMarketplaceData(): MarketplaceData | null {
  try {
    const dataPath = path.join(process.cwd(), 'examples/solana-job-platform/marketplace-data.json');
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to load marketplace data:', err);
  }
  return null;
}

function calculateDashboardMetrics(data: MarketplaceData) {
  const profile = data.profiles?.[0];
  const totalEarnings = profile?.totalEarnings ?? 0;
  const completedJobs = profile?.completedJobs ?? 0;
  const totalExecutions = data.executions?.length ?? 0;
  const successRate = totalExecutions > 0
    ? ((data.executions?.filter(e => e.status === 'paid').length ?? 0) / totalExecutions * 100).toFixed(1)
    : '0';
  const tier = profile?.tier ?? 'Bronze';
  const reputation = profile?.reputation ?? 0;

  return {
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    completedJobs,
    successRate,
    tier,
    reputation,
    lastUpdate: new Date().toISOString(),
  };
}

export async function GET() {
  const data = loadMarketplaceData();
  const metrics = data ? calculateDashboardMetrics(data) : {
    totalEarnings: 0,
    completedJobs: 0,
    successRate: '0',
    tier: 'Bronze',
    reputation: 0,
    lastUpdate: new Date().toISOString(),
  };

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trinity CEO Dashboard - Real Data</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      color: #00d4ff;
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      color: #7b2cbf;
      font-size: 2em;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle { color: #8892b0; margin-bottom: 20px; font-size: 0.9em; }
    .panel {
      border: 1px solid #00d4ff;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      background: rgba(10, 10, 15, 0.8);
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
    }
    .metric {
      margin: 15px 0;
      padding: 12px;
      background: rgba(0, 212, 255, 0.05);
      border-left: 3px solid #7b2cbf;
      border-radius: 4px;
    }
    .metric-label {
      font-size: 0.85em;
      color: #8892b0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .metric-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #00ff41;
      margin-top: 5px;
    }
    .metric-value.purple { color: #7b2cbf; }
    .metric-value.cyan { color: #06b6d4; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: rgba(123, 44, 191, 0.1);
      border: 1px solid rgba(123, 44, 191, 0.3);
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 0.8em;
      color: #8892b0;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #00d4ff;
      margin-top: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8em;
      font-weight: bold;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
      margin-top: 10px;
    }
    .timestamp {
      font-size: 0.75em;
      color: #64ffda;
      margin-top: 15px;
      font-style: italic;
    }
    .note {
      background: rgba(6, 182, 212, 0.1);
      border-left: 3px solid #06b6d4;
      padding: 10px;
      margin-top: 15px;
      font-size: 0.85em;
      color: #8892b0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌐 Trinity AI CEO Dashboard</h1>
    <p class="subtitle">Real-Time Economic System Monitor (V28)</p>

    <div class="panel">
      <div class="metric">
        <div class="metric-label">System Status</div>
        <div class="metric-value cyan">● LIVE PRODUCTION</div>
        <span class="status-badge">✓ Connected</span>
      </div>

      <div class="metric">
        <div class="metric-label">Agent Tier</div>
        <div class="metric-value purple">${metrics.tier}</div>
      </div>

      <div class="metric">
        <div class="metric-label">Reputation Score</div>
        <div class="metric-value">${metrics.reputation.toLocaleString()}</div>
      </div>
    </div>

    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Net Earnings</div>
        <div class="stat-value">${metrics.totalEarnings.toFixed(2)}</div>
        <div style="font-size: 0.75em; color: #64ffda; margin-top: 4px;">SOL</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Jobs Completed</div>
        <div class="stat-value">${metrics.completedJobs}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${metrics.successRate}%</div>
      </div>
    </div>

    <div class="panel">
      <div class="metric">
        <div class="metric-label">Data Source</div>
        <div style="color: #8892b0; margin-top: 5px;">
          ${data
            ? '📊 Live from examples/solana-job-platform/marketplace-data.json'
            : '⚠️ No marketplace data found - using defaults'}
        </div>
        <div class="note">
          Trinity Dashboard now displays real metrics from marketplace-data.json instead of hardcoded values.
          Deploy smart contracts to Solana and run agents to populate real earnings data.
        </div>
      </div>
    </div>

    <div class="timestamp">
      Last updated: ${metrics.lastUpdate}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
