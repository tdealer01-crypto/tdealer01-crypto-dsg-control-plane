export const trinityDashboardHTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trinity AI Dashboard - Economic System Live Monitor</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  color: #00d4ff;
  overflow: hidden;
  height: 100vh;
}

.container {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  height: 100vh;
  gap: 10px;
  padding: 10px;
}

.panel {
  background: rgba(10, 10, 15, 0.8);
  border: 1px solid #00d4ff;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
}

.header {
  font-size: 12px;
  font-weight: bold;
  color: #7b2cbf;
  margin-bottom: 10px;
  text-transform: uppercase;
  border-bottom: 1px solid #7b2cbf;
  padding-bottom: 5px;
}

.metric {
  margin: 12px 0;
  padding: 10px;
  background: rgba(0, 212, 255, 0.05);
  border-left: 3px solid #00d4ff;
}

.metric-label {
  font-size: 10px;
  color: #8892b0;
  text-transform: uppercase;
}

.metric-value {
  font-size: 16px;
  font-weight: bold;
  color: #00d4ff;
  margin-top: 3px;
}

.metric-detail {
  font-size: 9px;
  color: #64ffda;
  margin-top: 2px;
}

.status {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.status.active {
  background: #00ff00;
  box-shadow: 0 0 10px #00ff00;
}

.status.inactive {
  background: #ff0000;
  opacity: 0.5;
}

.job-card {
  margin: 10px 0;
  padding: 10px;
  background: rgba(123, 44, 191, 0.1);
  border: 1px solid #7b2cbf;
  border-radius: 4px;
  font-size: 9px;
}

.job-id {
  color: #64ffda;
  font-weight: bold;
}

.job-type {
  color: #00d4ff;
  margin-top: 2px;
}

.job-price {
  color: #00ff00;
  margin-top: 2px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(0, 212, 255, 0.2);
  border-radius: 2px;
  margin-top: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #7b2cbf);
  width: 0%;
  transition: width 0.3s;
}

.chart {
  width: 100%;
  height: 120px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #00d4ff;
  border-radius: 4px;
  margin: 10px 0;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
}

.button {
  width: 100%;
  padding: 8px;
  margin: 5px 0;
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid #00d4ff;
  color: #00d4ff;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  font-size: 10px;
  text-transform: uppercase;
  transition: all 0.3s;
}

.button:hover {
  background: rgba(123, 44, 191, 0.4);
  border-color: #7b2cbf;
}

.button:active {
  transform: scale(0.98);
}

.center-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.big-metric {
  font-size: 28px;
  text-align: center;
  color: #00ff00;
  font-weight: bold;
}

.scrollable {
  max-height: 400px;
  overflow-y: auto;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 212, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: #00d4ff;
  border-radius: 3px;
}
</style>
</head>
<body>

<div class="container">
  <div class="panel">
    <div class="header">🔥 Phoenix Repair Engine</div>

    <div class="metric">
      <div class="metric-label">Bounty Pool</div>
      <div class="metric-value">5.25 SOL</div>
      <div class="metric-detail">4 repairs resolved</div>
    </div>

    <div class="metric">
      <div class="metric-label">Success Rate</div>
      <div class="metric-value">92.5%</div>
      <div class="metric-detail">24/26 tickets verified</div>
    </div>

    <div class="metric">
      <div class="metric-label">Avg Severity</div>
      <div class="metric-value">6.8 / 10</div>
      <div class="metric-detail">Security focus</div>
    </div>

    <div class="metric">
      <div class="metric-label">Earned Today</div>
      <div class="metric-value">1.25 SOL</div>
      <div class="metric-detail">+3 tickets this hour</div>
    </div>

    <canvas class="chart" id="repairChart"></canvas>

    <div class="header" style="margin-top: 20px;">Recent Tickets</div>
    <div class="scrollable">
      <div class="job-card">
        <div class="job-id">TICKET-2026-001</div>
        <div class="job-type">🔐 Security | Severity 8</div>
        <div class="job-price">✅ VERIFIED (0.5 SOL)</div>
        <div style="color: #64ffda; margin-top: 3px;">IndexError fix</div>
      </div>
      <div class="job-card">
        <div class="job-id">TICKET-2026-002</div>
        <div class="job-type">⚡ Performance | Severity 6</div>
        <div class="job-price">✅ VERIFIED (0.25 SOL)</div>
        <div style="color: #64ffda; margin-top: 3px;">Memory leak patch</div>
      </div>
    </div>

    <button class="button">+ Submit Repair</button>
  </div>

  <div class="center-column">
    <div class="panel">
      <div class="header">🌐 Trinity Orchestration</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="metric">
          <div class="metric-label">Mode</div>
          <div class="metric-value"><span class="status active"></span>LIVE</div>
        </div>
        <div class="metric">
          <div class="metric-label">Reliability</div>
          <div class="metric-value">99.9%</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="header">💰 Economic Dashboard</div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 12px; color: #8892b0;">NET PROFIT TODAY</div>
        <div class="big-metric">42.87 SOL</div>
      </div>
    </div>

    <div class="panel">
      <div class="header">🌐 Termux Grid</div>
      <div class="metric">
        <div class="metric-label">Active Jobs</div>
        <div class="metric-value">8 / 12</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="header">📊 System Monitor</div>
    <div class="metric">
      <div class="metric-label">Battery</div>
      <div class="metric-value">87% 🔌</div>
      <div class="progress-bar"><div class="progress-fill" style="width: 87%"></div></div>
    </div>
  </div>
</div>

<script>
function drawChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (val / 100) * (h - 10) - 5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

drawChart('repairChart', [45, 52, 48, 61, 58, 67, 72, 68, 75, 82]);
console.log('🚀 Trinity Dashboard Ready');
</script>

</body>
</html>`;
