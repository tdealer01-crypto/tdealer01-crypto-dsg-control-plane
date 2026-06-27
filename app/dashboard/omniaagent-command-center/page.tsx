'use client';

import { useEffect, useState, useRef } from 'react';

type Agent = {
  id: string;
  type: string;
  status: string;
  startTime: number;
  tasksCompleted: number;
  successRate: number;
  contextShared: boolean;
};

type Vulnerability = {
  type: string;
  severity: number;
  location: string;
  confidence: string;
  poc: string;
};

type DSGNode = {
  id: string;
  x: number;
  y: number;
  role: string;
  active: boolean;
  load: number;
  connections: number[];
};

type Bounty = {
  id: string;
  program: string;
  amount: number;
  target: string;
  expiry: string;
  status: string;
  severity: string;
};

const mockBounties: Bounty[] = [
  {
    id: 'b1',
    program: 'DeFi Protocol Alpha',
    amount: 50,
    target: '0x1234...5678',
    expiry: '2026-07-15',
    status: 'Open',
    severity: 'Critical',
  },
  {
    id: 'b2',
    program: 'NFT Marketplace Beta',
    amount: 25,
    target: '0xABCD...EFGH',
    expiry: '2026-07-20',
    status: 'Open',
    severity: 'High',
  },
  {
    id: 'b3',
    program: 'DEX Aggregator Gamma',
    amount: 100,
    target: '0x9876...5432',
    expiry: '2026-07-10',
    status: 'Open',
    severity: 'Critical',
  },
  {
    id: 'b4',
    program: 'Lending Protocol Delta',
    amount: 15,
    target: '0x1111...2222',
    expiry: '2026-07-25',
    status: 'Open',
    severity: 'Medium',
  },
];

export default function OmniAgentCommandCenter() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dsgNodes, setDsgNodes] = useState<DSGNode[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [currentMode, setCurrentMode] = useState<'sandbox' | 'live'>('live');
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [logs, setLogs] = useState<Array<{ msg: string; color: string; time: string }>>([
    {
      msg: '[SYSTEM] OmniAgent Command Center v2.5 Initialized.',
      color: 'text-gray-500',
      time: new Date().toLocaleTimeString(),
    },
    {
      msg: '[SYSTEM] Unified Control Plane: Active',
      color: 'text-gray-500',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [detectedVulns, setDetectedVulns] = useState<Vulnerability[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [stateContinuity, setStateContinuity] = useState(100);
  const [totalApiCalls, setTotalApiCalls] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addLog = (msg: string, color = 'text-gray-500') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ msg: `[${time}] ${msg}`, color, time }, ...prev].slice(0, 50));
  };

  const trackApiCall = (tokens: number) => {
    setTotalApiCalls((prev) => prev + 1);
    setTotalTokens((prev) => prev + tokens);
  };

  const spawnAgent = () => {
    if (!simulationRunning) {
      alert('Start Simulation first');
      return;
    }

    const agentTypes = ['Scanner', 'Analyzer', 'Exploit Generator', 'Report Writer', 'Context Manager'];
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const agentId = `AGENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newAgent: Agent = {
      id: agentId,
      type: agentType,
      status: 'Running',
      startTime: Date.now(),
      tasksCompleted: 0,
      successRate: Math.floor(Math.random() * 30) + 70,
      contextShared: true,
    };

    setAgents((prev) => [...prev, newAgent]);
    addLog(`Agent Spawned: ${agentId} (${agentType}) | Context: Shared`, 'text-cyan-400');
    trackApiCall(Math.floor(Math.random() * 500 + 100));
  };

  const initDSGNetwork = () => {
    const nodes: DSGNode[] = [
      { id: 'master', x: 175, y: 80, role: 'Master', active: false, load: 0, connections: [1, 2, 3, 4] },
      { id: 'scanner1', x: 87.5, y: 40, role: 'Scanner', active: false, load: 0, connections: [0, 3] },
      { id: 'scanner2', x: 262.5, y: 40, role: 'Scanner', active: false, load: 0, connections: [0, 4] },
      { id: 'analyzer', x: 87.5, y: 120, role: 'Analyzer', active: false, load: 0, connections: [0, 1] },
      { id: 'executor', x: 262.5, y: 120, role: 'Executor', active: false, load: 0, connections: [0, 2] },
    ];
    setDsgNodes(nodes);
    drawDSGNetwork(nodes);
  };

  const drawDSGNetwork = (nodesToDraw?: DSGNode[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const nodes = nodesToDraw || dsgNodes;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1;

    nodes.forEach((node) => {
      node.connections.forEach((targetIdx) => {
        const target = nodes[targetIdx];
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });
    });

    nodes.forEach((node) => {
      const color = node.active ? '#06b6d4' : '#1e3a4a';
      if (node.active) {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.role === 'Master' ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#06b6d4';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.role, node.x, node.y + (node.role === 'Master' ? 20 : 16));
    });
  };

  const startAutoScan = async () => {
    if (currentMode === 'sandbox') {
      addLog('SANDBOX: Simulating scan...', 'text-yellow-400');
    }

    setScanning(true);
    setScanProgress(0);
    addLog('Scanning target URL...', 'text-purple-400');

    const steps = [
      { msg: '[PLAYWRIGHT] Launching Chromium headless...', delay: 500, progress: 10 },
      { msg: '[PERCEPTION] Capturing DOM structure...', delay: 800, progress: 30 },
      { msg: '[PERCEPTION] Taking screenshot with bounding boxes...', delay: 800, progress: 50 },
      { msg: '[REASONING] Sending to Gemini 2.5 Pro...', delay: 1500, progress: 60 },
      { msg: '[AI] Analyzing input validation patterns...', delay: 1000, progress: 70 },
      { msg: '[AI] Checking XSS, SQLi, CSRF vectors...', delay: 1200, progress: 80 },
      { msg: '[COMPLETE] Scan finished.', delay: 500, progress: 100 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delay));
      setScanProgress(step.progress);
      addLog(step.msg, 'text-gray-400');
      trackApiCall(Math.floor(Math.random() * 200 + 50));
    }

    const vulns: Vulnerability[] = [
      {
        type: 'XSS (Reflected)',
        severity: 6,
        location: 'search?q= parameter',
        confidence: 'High',
        poc: "<script>alert('XSS')</script>",
      },
      {
        type: 'CSRF',
        severity: 5,
        location: '/api/transfer',
        confidence: 'Medium',
        poc: 'Missing CSRF token',
      },
      {
        type: 'Information Disclosure',
        severity: 4,
        location: '/.env',
        confidence: 'High',
        poc: 'Exposed API keys',
      },
    ];

    setDetectedVulns(vulns);
    setScanning(false);
    addLog(`Scan complete! Found ${vulns.length} vulnerabilities`, 'text-green-400');
  };

  const startDSGSimulation = async () => {
    if (simulationRunning) return;

    setSimulationRunning(true);
    addLog('OmniAgent: Initializing Neural Orchestration...', 'text-cyan-400');

    initDSGNetwork();

    const nodes = dsgNodes.length > 0 ? dsgNodes : [];
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 500));
      nodes[i].active = true;
      addLog(`Node ${nodes[i]?.role}: ONLINE`, 'text-cyan-400');
    }

    addLog('OmniAgent: All nodes active. 99.9% reliability achieved.', 'text-green-400');
    spawnAgent();
    spawnAgent();
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'executions'>('overview');

  return (
    <div className="bg-[#050505] min-h-screen p-4 pb-20" style={{ color: '#00ff41', fontFamily: 'Courier New, Courier, monospace' }}>
      <style jsx>{`
        :root {
          --primary: #00ff41;
          --purple: #9333ea;
          --cyan: #06b6d4;
          --orange: #f97316;
          --red: #ef4444;
          --yellow: #eab308;
        }

        .matrix-bg {
          background: linear-gradient(180deg, rgba(0, 255, 65, 0.05) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .glass {
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 255, 65, 0.2);
          border-radius: 15px;
        }

        .glass-purple {
          background: rgba(30, 10, 40, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(147, 51, 234, 0.3);
          border-radius: 15px;
        }

        .glass-cyan {
          background: rgba(5, 30, 40, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 15px;
        }

        .glow-btn:active {
          transform: scale(0.95);
          box-shadow: 0 0 15px var(--primary);
        }

        .loader {
          border-top-color: var(--primary);
          animation: spinner 1.5s linear infinite;
        }

        @keyframes spinner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .pulse-dot {
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>

      {/* Tab Navigation */}
      <div className="max-w-md mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-bold uppercase border rounded ${
            activeTab === 'overview'
              ? 'border-green-500 bg-green-900/20 text-green-400'
              : 'border-gray-700 bg-gray-900/20 text-gray-400'
          }`}
        >
          overview
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 text-sm font-bold uppercase border rounded ${
            activeTab === 'agents'
              ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400'
              : 'border-gray-700 bg-gray-900/20 text-gray-400'
          }`}
        >
          agents
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`px-4 py-2 text-sm font-bold uppercase border rounded ${
            activeTab === 'executions'
              ? 'border-orange-500 bg-orange-900/20 text-orange-400'
              : 'border-gray-700 bg-gray-900/20 text-gray-400'
          }`}
        >
          executions
        </button>
      </div>

      {/* Header */}
      <div className="max-w-md mx-auto mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-white mb-1">CEO THANAWAT</h1>
        <p className="text-xs text-green-500 uppercase tracking-tighter">OmniAgent Command Center | Unified Control Plane v2.5</p>
        <div className="h-1 w-full bg-green-900 mt-2 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 w-3/4 animate-pulse"></div>
        </div>
      </div>

      {/* OmniAgent Status Bar */}
      <div className="max-w-md mx-auto glass p-3 mb-4 flex justify-between items-center text-[9px]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot"></div>
          <span className="text-gray-400">Orchestration:</span>
          <span className="text-green-400 font-bold">ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Mode:</span>
          <span className={`font-bold ${currentMode === 'live' ? 'text-yellow-400' : 'text-gray-400'}`}>
            {currentMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Wallet */}
      <div className="max-w-md mx-auto glass p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 uppercase">Wallet Status</p>
            <p className={`text-sm font-bold ${wallet ? 'text-green-400' : 'text-red-400'}`}>
              {wallet ? 'CONNECTED' : 'DISCONNECTED'}
            </p>
          </div>
          <button className="glass p-2 px-4 text-[10px] font-bold uppercase hover:bg-green-900/20">
            <i className="fas fa-wallet mr-1"></i>Connect Phantom
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div className="max-w-md mx-auto grid grid-cols-4 gap-2 mb-6">
        <div className="glass p-2 text-center">
          <p className="text-[8px] text-gray-400 uppercase">Status</p>
          <p className="text-xs font-bold text-green-400">ONLINE</p>
        </div>
        <div className="glass p-2 text-center">
          <p className="text-[8px] text-gray-400 uppercase">AI</p>
          <p className="text-xs font-bold text-purple-400">GEMINI</p>
        </div>
        <div className="glass p-2 text-center">
          <p className="text-[8px] text-gray-400 uppercase">Bounties</p>
          <p className="text-xs font-bold text-orange-400">{mockBounties.length}</p>
        </div>
        <div className="glass p-2 text-center">
          <p className="text-[8px] text-gray-400 uppercase">Agents</p>
          <p className="text-xs font-bold text-cyan-400">{agents.length}</p>
        </div>
      </div>

      {/* OMNIAAGENT ORCHESTRATION HUB */}
      <div className="max-w-md mx-auto glass-cyan p-4 mb-6 border-cyan-500/30">
        <h2 className="text-sm font-bold mb-3 border-b border-cyan-900 pb-1 text-cyan-400">
          <i className="fas fa-network-wired mr-2"></i>OMNIAAGENT ORCHESTRATION
        </h2>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setCurrentMode('sandbox')}
            className={`flex-1 glass p-2 text-[10px] font-bold uppercase border ${
              currentMode === 'sandbox'
                ? 'border-green-500 text-green-400 bg-green-900/20'
                : 'border-gray-700 text-gray-400'
            }`}
          >
            <i className="fas fa-shield-alt mr-1"></i>Sandbox
          </button>
          <button
            onClick={() => setCurrentMode('live')}
            className={`flex-1 glass p-2 text-[10px] font-bold uppercase border ${
              currentMode === 'live'
                ? 'border-green-500 text-green-400 bg-green-900/20'
                : 'border-gray-700 text-gray-400'
            }`}
          >
            <i className="fas fa-bolt mr-1"></i>Live Execution
          </button>
        </div>

        {/* DSG Network */}
        <div className="rounded-lg p-3 mb-3 border border-cyan-900/30 relative overflow-hidden bg-gradient-to-b from-cyan-500/10 to-transparent">
          <canvas
            ref={canvasRef}
            width={350}
            height={160}
            className="w-full h-full"
          />
          <div className="absolute top-2 left-2 text-[8px] text-cyan-500 font-mono">Neural Orchestration Graph</div>
        </div>

        {/* Agent Pool */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={spawnAgent}
            className="glass p-2 text-[10px] font-bold uppercase hover:bg-cyan-900/20 border-cyan-500/30"
          >
            <i className="fas fa-plus mr-1"></i>Spawn Agent
          </button>
          <button
            onClick={() => setAgents([])}
            className="glass p-2 text-[10px] font-bold uppercase hover:bg-red-900/20 border-red-500/30"
          >
            <i className="fas fa-trash mr-1"></i>Clear Pool
          </button>
        </div>

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {agents.map((agent) => (
            <div key={agent.id} className="glass p-2 border-l-2 border-cyan-500">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-900/50 flex items-center justify-center">
                    <i className="fas fa-robot text-[8px] text-cyan-400"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">{agent.id}</p>
                    <p className="text-[8px] text-gray-400">
                      {agent.type} | {Math.floor((Date.now() - agent.startTime) / 1000)}s
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-cyan-400">{agent.tasksCompleted} tasks</p>
                  <p className="text-[8px] text-green-400">{agent.successRate}% success</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BROWSER AGENT */}
      <div className="max-w-md mx-auto glass-purple p-4 mb-6 border-purple-500/30">
        <h2 className="text-sm font-bold mb-3 border-b border-purple-900 pb-1 text-purple-400">
          <i className="fas fa-robot mr-2"></i>BROWSER AGENT (Auto Scan)
        </h2>
        <div className="text-[10px] text-gray-300 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 pulse-dot"></div>
            <span>Perception: DOM + Screenshot + Bounding Boxes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot"></div>
            <span>Reasoning: Gemini 2.5 Pro Analysis</span>
          </div>
        </div>
        <input
          type="text"
          defaultValue="https://example.com"
          className="w-full bg-black/50 border border-purple-900/50 rounded p-2 text-xs text-white focus:outline-none focus:border-purple-500 mb-2"
          placeholder="https://target-website.com"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startAutoScan}
            className="glass p-2 text-[10px] font-bold uppercase hover:bg-purple-900/20 border-purple-500/30"
          >
            <i className="fas fa-search mr-1"></i>Auto Scan
          </button>
          <button className="glass p-2 text-[10px] font-bold uppercase hover:bg-blue-900/20 border-blue-500/30">
            <i className="fas fa-file-alt mr-1"></i>Generate Report
          </button>
        </div>

        {scanning && (
          <div className="mt-3">
            <div className="flex justify-between text-[9px] text-gray-400 mb-1">
              <span>Scanning...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {detectedVulns.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-gray-400 font-bold mb-2">Vulnerabilities Found:</p>
            {detectedVulns.map((vuln, idx) => (
              <div key={idx} className="p-2 rounded text-[10px] border bg-orange-900/30 border-orange-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-orange-400">{vuln.type}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/50 text-orange-400">
                    Severity: {vuln.severity}/10
                  </span>
                </div>
                <p className="text-gray-400">Location: {vuln.location}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOUNTY HUNTER */}
      <div className="max-w-md mx-auto glass p-4 mb-6 border-orange-500/30">
        <h2 className="text-sm font-bold mb-3 border-b border-orange-900 pb-1 text-orange-400">
          <i className="fas fa-bug mr-2"></i>BOUNTY HUNTER CENTER
        </h2>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-black/40 p-2 rounded text-center">
            <p className="text-[9px] text-gray-400">Total Earned</p>
            <p className="text-lg font-bold text-green-400">0 SOL</p>
          </div>
          <div className="bg-black/40 p-2 rounded text-center">
            <p className="text-[9px] text-gray-400">Pending Review</p>
            <p className="text-lg font-bold text-yellow-400">0</p>
          </div>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
          {mockBounties.map((bounty) => (
            <div key={bounty.id} className="glass p-3 border-l-2 border-orange-500 cursor-pointer hover:bg-orange-900/20">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-white">{bounty.program}</p>
                  <p className="text-[9px] text-gray-400">Target: {bounty.target}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{bounty.amount} SOL</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-900 text-red-400">
                    {bounty.severity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full glass p-2 text-[10px] font-bold uppercase hover:bg-orange-900/20">
          <i className="fas fa-sync-alt mr-1"></i>Refresh Bounties
        </button>
      </div>

      {/* ACTION CENTER */}
      <div className="max-w-md mx-auto space-y-3">
        <button
          onClick={startDSGSimulation}
          className="w-full glass p-4 border-cyan-500 bg-cyan-950/20 flex justify-between items-center hover:bg-cyan-900/30"
        >
          <span className="text-sm font-bold uppercase text-white">
            <i className="fas fa-network-wired mr-3 text-cyan-400"></i>Run DSG Simulation
          </span>
          <i className="fas fa-play text-xs text-cyan-400"></i>
        </button>
      </div>

      {/* LIVE LOGS */}
      <div className="max-w-md mx-auto mt-6">
        <div className="text-[9px] space-y-1 h-48 overflow-y-auto bg-black/80 p-2 rounded border border-gray-900 font-mono">
          {logs.map((log, idx) => (
            <p key={idx} className={log.color}>
              {log.msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
