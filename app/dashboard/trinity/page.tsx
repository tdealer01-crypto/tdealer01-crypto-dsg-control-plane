'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tabs, Badge, Table, StatCard } from '@/components/ui';
import { Zap, CheckCircle, TrendingUp, Users } from 'lucide-react';

export default function TrinityDashboard() {
  const [job, setJob] = useState({ title: '', category: '', reward: '' });
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsConnected(Math.random() > 0.1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const agents = [
    { name: 'Mind', status: 'registered', role: 'Job discovery across 6 platforms', emoji: '🧠' },
    { name: 'Hand', status: 'registered', role: 'Work execution and deliverables', emoji: '✋' },
    { name: 'Eye', status: 'registered', role: 'Quality verification and validation', emoji: '👁️' },
    { name: 'Nerve', status: 'registered', role: 'Payment settlement and reputation', emoji: '⚡' },
    { name: 'Spine', status: 'registered', role: 'DSG governance and audit trail', emoji: '🦴' },
  ];

  const jobs = [
    {
      id: '1',
      title: 'Fix reentrancy vulnerability in ERC-20 vault',
      category: 'smart-contract-audit',
      reward: 5.0,
      difficulty: 'hard',
      platform: 'GitHub Bounties',
    },
    {
      id: '2',
      title: 'Implement OAuth 2.0 authentication module',
      category: 'backend-dev',
      reward: 3.5,
      difficulty: 'medium',
      platform: 'Solana Bounties',
    },
    {
      id: '3',
      title: 'Design React UI component library',
      category: 'frontend-dev',
      reward: 2.0,
      difficulty: 'medium',
      platform: 'Internal Projects',
    },
  ];

  const historyData = [
    { id: '1', jobTitle: 'Smart Contract Security Audit', status: 'success', execTimeMs: 2847, created: '2026-06-29 13:20' },
    { id: '2', jobTitle: 'Backend API Development', status: 'success', execTimeMs: 5123, created: '2026-06-29 13:10' },
  ];

  const handleExecute = async () => {
    if (!job.title || !job.reward) {
      alert('Please fill in all required fields');
      return;
    }

    setExecuting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockResult = {
      planHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9',
      governance: {
        approved: true,
        decision: 'ALLOW',
        constraints: [
          { name: 'max_duration', satisfied: true },
          { name: 'max_cost', satisfied: true },
          { name: 'security_check', satisfied: true },
        ],
      },
      execution: {
        qualityScore: 85,
        executionTimeMs: 2500,
        deliverableLength: 1024,
      },
      verification: { passed: true, qualityScore: 90 },
      reputation: { newReputation: 82, reputationChange: 2 },
    };

    setResult(mockResult);
    setExecuting(false);
  };

  const handleUseJob = (selectedJob: typeof jobs[0]) => {
    setJob({
      title: selectedJob.title,
      category: selectedJob.category,
      reward: String(selectedJob.reward),
    });
  };

  const tabsData = [
    {
      key: 'agents',
      label: 'Agents',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {agents.map(agent => (
            <Card key={agent.name} variant="gold">
              <div className="text-center space-y-2">
                <div className="text-4xl">{agent.emoji}</div>
                <h3 className="font-bold text-[#F8FAFC]">{agent.name}</h3>
                <p className="text-xs text-[#AAB3C5]">{agent.role}</p>
                <Badge>✓ {agent.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'orchestrate',
      label: 'Orchestrate',
      content: (
        <div className="space-y-6">
          <Card variant="gold">
            <div className="space-y-4">
              <Input
                label="Job Title"
                value={job.title}
                onChange={e => setJob({ ...job, title: e.target.value })}
                placeholder="e.g., Smart Contract Audit"
                leftIcon={<Zap className="w-4 h-4" />}
              />

              <Input
                label="Category"
                value={job.category}
                onChange={e => setJob({ ...job, category: e.target.value })}
                placeholder="e.g., smart-contract-audit"
              />

              <Input
                label="Reward Amount (SOL)"
                type="number"
                value={job.reward}
                onChange={e => setJob({ ...job, reward: e.target.value })}
                placeholder="0.0"
                step="0.1"
                min="0"
              />

              <Button
                variant="primary"
                size="lg"
                onClick={handleExecute}
                disabled={executing || !job.title}
                type="button"
              >
                {executing ? 'Executing...' : '▶ Execute Orchestration'}
              </Button>
            </div>
          </Card>

          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#F7DC78]">Execution Result</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Governance"
                  value={result.governance.approved ? '✓ Approved' : '✗ Blocked'}
                  variant="success"
                  icon={<CheckCircle className="w-5 h-5" />}
                />
                <StatCard
                  label="Quality Score"
                  value={`${result.execution.qualityScore}%`}
                  variant="info"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                  label="Verification"
                  value={result.verification.passed ? '✓ Passed' : '✗ Failed'}
                  variant="success"
                />
                <StatCard
                  label="Reputation"
                  value={`+${result.reputation.reputationChange}`}
                  variant="warning"
                  icon={<Users className="w-5 h-5" />}
                />
              </div>

              <Card variant="default">
                <div className="space-y-2">
                  <p className="text-xs text-[#AAB3C5] uppercase tracking-widest font-semibold">Plan Hash</p>
                  <p className="font-mono text-sm text-[#F7DC78] break-all">{result.planHash}</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'discover',
      label: 'Discover Jobs',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jobs.map(j => (
            <Card key={j.id} variant="gold">
              <div className="space-y-3">
                <h4 className="font-bold text-[#F8FAFC]">{j.title}</h4>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{j.platform}</Badge>
                  <Badge>
                    {j.difficulty === 'easy' ? '⭐ Easy' : j.difficulty === 'medium' ? '⭐⭐ Medium' : '⭐⭐⭐ Hard'}
                  </Badge>
                </div>
                <p className="text-sm text-[#AAB3C5]">{j.reward} SOL</p>
                <Button variant="secondary" size="sm" onClick={() => handleUseJob(j)} type="button">
                  Use Job
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'history',
      label: 'History',
      content: (
        <Table
          columns={[
            { key: 'jobTitle', label: 'Job Title', align: 'left' },
            {
              key: 'status',
              label: 'Status',
              render: (status: unknown) => <Badge>{status === 'success' ? '✓ Success' : '✗ Failed'}</Badge>,
            },
            { key: 'execTimeMs', label: 'Time (ms)', align: 'center' },
            { key: 'created', label: 'Created', align: 'right' },
          ]}
          rows={historyData}
          sortable
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] p-6 md:p-8">
      <style>{`
        .gradient-text {
          background: linear-gradient(135deg, #F7DC78, #E10600);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <h1 className="gradient-text text-3xl md:text-4xl font-black mb-2">Trinity AI Orchestration</h1>
        <p className="text-[#AAB3C5] mb-4">5-Agent Multi-Agent System for Job Discovery, Execution, Verification & Settlement</p>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {isConnected ? '● Real-time Connected' : '● Connection Lost'}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabsData} defaultTab="agents" />

      {/* Capabilities */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-[#F7DC78] mb-4">Trinity Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">🧠 Mind Agent</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• Discover jobs across 6 platforms</li>
                <li>• Filter by category and difficulty</li>
                <li>• Real-time job monitoring</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">✋ Hand Agent</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• Execute jobs with deliverables</li>
                <li>• Quality scoring (0-100%)</li>
                <li>• Execution time tracking</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">👁️ Eye Agent</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• Verify deliverable quality</li>
                <li>• Blockchain tx validation</li>
                <li>• Issue detection</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">⚡ Nerve Agent</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• SOL token settlement</li>
                <li>• Reputation management</li>
                <li>• Tier advancement</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">🦴 Spine Agent</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• Deterministic plan hashing</li>
                <li>• DSG governance validation</li>
                <li>• Immutable audit trail</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">📊 Analytics</h4>
              <ul className="text-sm text-[#AAB3C5] space-y-1">
                <li>• Execution history tracking</li>
                <li>• Performance metrics</li>
                <li>• Status monitoring</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
