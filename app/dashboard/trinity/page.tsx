'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tabs, Badge, Table, StatCard } from '@/components/ui';
import { Zap, CheckCircle, TrendingUp, Users, Download, Trash2 } from 'lucide-react';

export default function TrinityDashboard() {
  const [job, setJob] = useState({ title: '', category: '', reward: '' });
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string; toolCalls?: string[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<'Mind' | 'Hand' | 'Eye' | 'Nerve' | 'Spine' | 'All'>('All');
  const [language, setLanguage] = useState<'th' | 'en'>('en');
  const [modelProvider, setModelProvider] = useState<'anthropic' | 'nvidia'>('anthropic');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Team Coordinator state
  const [teamTask, setTeamTask] = useState({ title: '', description: '', priority: 'medium' });
  const [selectedAgentsForTeam, setSelectedAgentsForTeam] = useState<string[]>(['Mind', 'Hand', 'Eye', 'Nerve', 'Spine']);
  const [teamExecuting, setTeamExecuting] = useState(false);
  const [teamResults, setTeamResults] = useState<Record<string, any>>({});
  const [teamWorkflow, setTeamWorkflow] = useState<Array<{ agent: string; status: 'pending' | 'running' | 'completed' | 'error'; result?: string }>>([]);

  // Live system state from real Trinity APIs
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveRun, setLiveRun] = useState(false);

  // Translations
  const t = language === 'th' ? {
    agentChat: '💬 แชทกับเอเจนต์',
    selectAgent: 'เลือกเอเจนต์',
    askQuestion: 'ถามเกี่ยวกับงาน การปฏิบัติ หรือการจัดการ...',
    thinking: 'เอเจนต์กำลังคิด...',
    exportChat: '📥 ส่งออก',
    clearChat: '🗑️ ลบ',
    language: 'ภาษา',
    teamCoordinator: '👥 ทีมประสานงาน',
    teamTask: 'งานทีม',
    taskTitle: 'ชื่องาน',
    taskDescription: 'รายละเอียด',
    selectAgents: 'เลือกเอเจนต์',
    priority: 'ความสำคัญ',
    executeTeam: 'รัน',
    teamWorkflow: 'ขั้นตอนทีม',
  } : {
    agentChat: '💬 Agent Chat',
    selectAgent: 'Select Agent',
    askQuestion: 'Ask about jobs, execution, governance...',
    thinking: 'Agent thinking...',
    exportChat: '📥 Export',
    clearChat: '🗑️ Clear',
    language: 'Language',
    teamCoordinator: '👥 Team Coordinator',
    teamTask: 'Team Task',
    taskTitle: 'Task Title',
    taskDescription: 'Description',
    selectAgents: 'Select Agents',
    priority: 'Priority',
    executeTeam: 'Execute Team',
    teamWorkflow: 'Team Workflow',
  };

  // Heartbeat: poll the real Trinity status API
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/trinity/status');
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) {
          setIsConnected(true);
          setSystemStatus(data);
        }
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch('/api/trinity/discover?limit=9');
      const data = await res.json();
      setLiveJobs(
        (data.jobs ?? []).map((j: any) => ({
          id: j.id,
          title: j.title,
          category: j.category,
          reward: j.reward?.amount ?? 0,
          currency: j.reward?.currency ?? 'SOL',
          difficulty: j.difficulty,
          platform: j.platform,
          source: j.source,
        }))
      );
    } catch {
      setLiveJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/trinity/history?limit=20');
      const data = await res.json();
      setHistoryRows(
        (data.executions ?? []).map((e: any) => ({
          id: e.id,
          jobTitle: e.job_title,
          status: e.status,
          execTimeMs: e.execution_time,
          created: e.created_at ? new Date(e.created_at).toLocaleString() : '-',
        }))
      );
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userInputMessage = chatInput;
    const userMessage = {
      role: 'user' as const,
      content: userInputMessage,
      timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
    };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Try streaming first, fall back to JSON
      const useStreaming = true;

      if (useStreaming) {
        // Streaming mode using SSE
        let assistantContent = '';
        let toolCalls: string[] = [];
        let toolResults: any[] = [];

        const response = await fetch('/api/dashboard/trinity/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInputMessage,
            agent: selectedAgent,
            sessionId,
            language,
            streaming: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Stream error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === 'tool_start') {
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      return prev;
                    }
                    return [...prev, {
                      role: 'assistant' as const,
                      content: `🔧 ${event.data.tool}...`,
                      timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
                    }];
                  });
                } else if (event.type === 'tool_result') {
                  toolCalls.push(event.data.tool);
                  toolResults.push({ tool: event.data.tool, result: event.data.result });
                } else if (event.type === 'response') {
                  assistantContent = event.data.text;
                  toolCalls = event.data.toolCalls || [];
                } else if (event.type === 'error') {
                  assistantContent = `Error: ${event.data.message}`;
                }
              } catch (e) {
                // Parse error, continue
              }
            }
          }
        }

        if (assistantContent) {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.content.startsWith('🔧')) {
              // Replace tool loading message with actual response
              return [...prev.slice(0, -1), {
                role: 'assistant' as const,
                content: assistantContent,
                timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
                toolCalls,
              }];
            }
            return [...prev, {
              role: 'assistant' as const,
              content: assistantContent,
              timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
              toolCalls,
            }];
          });
        }
      } else {
        // Fallback to non-streaming
        const response = await fetch('/api/dashboard/trinity/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInputMessage,
            agent: selectedAgent,
            sessionId,
            language,
          }),
        });

        if (!response.ok) throw new Error('Chat failed');

        const data = await response.json();
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.response,
          timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
          toolCalls: data.toolCalls,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: language === 'th' ? 'ขออภัย เกิดข้อผิดพลาด' : 'Sorry, there was an error processing your request.',
        timestamp: new Date().toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US'),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportChat = () => {
    const chatData = {
      sessionId,
      agent: selectedAgent,
      language,
      exportedAt: new Date().toISOString(),
      messages: messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp).toISOString(),
      })),
    };

    const jsonStr = JSON.stringify(chatData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trinity-chat-${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = () => {
    if (window.confirm(language === 'th' ? 'ลบประวัติแชท?' : 'Clear chat history?')) {
      setMessages([]);
    }
  };

  const agentMeta = [
    { name: 'Mind', emoji: '🧠', fallbackRole: 'Job discovery across live bounty sources' },
    { name: 'Hand', emoji: '✋', fallbackRole: 'Work execution and deliverables' },
    { name: 'Eye', emoji: '👁️', fallbackRole: 'Quality verification and validation' },
    { name: 'Nerve', emoji: '⚡', fallbackRole: 'Payment settlement and reputation' },
    { name: 'Spine', emoji: '🦴', fallbackRole: 'DSG governance and audit trail' },
  ];
  const agents = agentMeta.map(a => ({
    name: a.name,
    emoji: a.emoji,
    role: systemStatus?.agents?.[a.name]?.role ?? a.fallbackRole,
    status: systemStatus?.agents?.[a.name]?.status ?? 'offline',
  }));

  const handleExecute = async () => {
    if (!job.title || !job.reward) {
      alert('Please fill in all required fields');
      return;
    }

    setExecuting(true);
    setResult(null);
    try {
      const res = await fetch('/api/trinity/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: {
            title: job.title,
            category: job.category || 'general',
            rewardAmount: Number(job.reward),
          },
          dry_run: !liveRun,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (liveRun) loadHistory();
    } catch (error) {
      console.error('Orchestrate error:', error);
      setResult({ ok: false, error: 'Orchestration request failed' });
    } finally {
      setExecuting(false);
    }
  };

  const handleUseJob = (selectedJob: { title: string; category: string; reward: number }) => {
    setJob({
      title: selectedJob.title,
      category: selectedJob.category,
      reward: String(selectedJob.reward),
    });
  };

  const handleExecuteTeam = async () => {
    if (!teamTask.title || selectedAgentsForTeam.length === 0) {
      alert(language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in required fields');
      return;
    }

    setTeamExecuting(true);
    const workflow: typeof teamWorkflow = selectedAgentsForTeam.map(agent => ({
      agent,
      status: 'pending' as const,
    }));
    setTeamWorkflow(workflow);
    setTeamResults({});

    // Real data sources: Mind reads live discovery; Hand/Eye/Nerve/Spine read one real orchestration run
    let discoverData: any = null;
    let orchestrateData: any = null;
    const needsOrchestrate = selectedAgentsForTeam.some(a => a !== 'Mind');

    try {
      if (selectedAgentsForTeam.includes('Mind')) {
        const res = await fetch('/api/trinity/discover?limit=5');
        discoverData = await res.json();
      }
      if (needsOrchestrate) {
        const res = await fetch('/api/trinity/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job: { title: teamTask.title, category: 'general', rewardAmount: 1 },
            dry_run: true,
          }),
        });
        orchestrateData = await res.json();
      }
    } catch (error) {
      console.error('Team execution error:', error);
    }

    const buildAgentResult = (agent: string): { text: string; ok: boolean } => {
      switch (agent) {
        case 'Mind': {
          if (!discoverData?.ok) return { text: 'Discovery failed — no live response', ok: false };
          const platforms = Array.from(new Set((discoverData.jobs ?? []).map((j: any) => j.platform))).join(', ');
          return { text: `Found ${discoverData.count ?? 0} live jobs${platforms ? ` from ${platforms}` : ''}`, ok: true };
        }
        case 'Hand': {
          const ex = orchestrateData?.execution;
          if (!ex) return { text: 'Execution data unavailable', ok: false };
          return { text: `Deliverable generated: ${ex.deliverableLength} chars, quality ${ex.qualityScore}%, ${ex.executionTimeMs}ms`, ok: true };
        }
        case 'Eye': {
          const v = orchestrateData?.verification;
          if (!v) return { text: 'Verification data unavailable', ok: false };
          const issues = v.issues?.length ? ` — ${v.issues.join('; ')}` : '';
          return { text: `Verification ${v.passed ? 'passed' : 'failed'} (score ${v.qualityScore}%)${issues}`, ok: Boolean(v.passed) };
        }
        case 'Nerve': {
          const r = orchestrateData?.reputation;
          if (!r) return { text: 'Reputation data unavailable', ok: false };
          const sign = r.reputationChange >= 0 ? '+' : '';
          return { text: `Reputation ${r.newReputation} (${sign}${r.reputationChange})${orchestrateData?.settlement ? ' — settlement attempted' : ''}`, ok: true };
        }
        case 'Spine': {
          const g = orchestrateData?.governance;
          if (!g) return { text: 'Governance data unavailable', ok: false };
          const violations = g.violations?.length ? ` — ${g.violations.join('; ')}` : '';
          const hash = String(orchestrateData?.planHash ?? '').slice(0, 16);
          return { text: `Governance ${g.approved ? 'ALLOW' : 'BLOCK'}${violations}${hash ? ` — planHash ${hash}…` : ''}`, ok: Boolean(g.approved) };
        }
        default:
          return { text: 'No data', ok: false };
      }
    };

    const results: Record<string, any> = {};
    for (let i = 0; i < selectedAgentsForTeam.length; i++) {
      const agent = selectedAgentsForTeam[i];
      workflow[i].status = 'running';
      setTeamWorkflow([...workflow]);

      const { text, ok } = buildAgentResult(agent);
      results[agent] = {
        status: ok ? 'success' : 'error',
        response: text,
        timestamp: new Date().toLocaleTimeString(),
      };
      workflow[i].status = ok ? 'completed' : 'error';
      workflow[i].result = text;
      setTeamWorkflow([...workflow]);
      setTeamResults({ ...results });
    }

    setTeamExecuting(false);
  };

  const toggleAgentSelection = (agentName: string) => {
    setSelectedAgentsForTeam(prev =>
      prev.includes(agentName) ? prev.filter(a => a !== agentName) : [...prev, agentName]
    );
  };

  const tabsData = [
    {
      key: 'chat',
      label: t.agentChat,
      content: (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Agent Selection */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-[#E0E5EE]">{t.selectAgent}:</span>
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value as any)}
                className="px-3 py-1 bg-[#1a1a24] text-[#F7DC78] border border-[#F7DC78]/20 rounded-lg text-sm focus:outline-none focus:border-[#F7DC78]"
              >
                <option value="All">🤖 All Agents</option>
                <option value="Mind">🧠 Mind (Discovery)</option>
                <option value="Hand">✋ Hand (Execution)</option>
                <option value="Eye">👁️ Eye (Verification)</option>
                <option value="Nerve">⚡ Nerve (Payment)</option>
                <option value="Spine">🦴 Spine (Governance)</option>
              </select>
            </div>

            {/* Model Selection */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-[#E0E5EE]">Model:</span>
              <select
                value={modelProvider}
                onChange={e => setModelProvider(e.target.value as any)}
                className="px-3 py-1 bg-[#1a1a24] text-[#F7DC78] border border-[#F7DC78]/20 rounded-lg text-sm focus:outline-none focus:border-[#F7DC78]"
              >
                <option value="anthropic">🧠 Claude (Anthropic)</option>
                <option value="nvidia">⚡ GLM (NVIDIA)</option>
              </select>
            </div>

            {/* Language Toggle */}
            <div className="flex gap-2 ml-auto">
              <span className="text-sm text-[#E0E5EE]">{t.language}:</span>
              <button
                onClick={() => setLanguage('th')}
                className={`px-2 py-1 text-xs rounded ${language === 'th' ? 'bg-[#F7DC78] text-[#0B0B0F]' : 'bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20'}`}
              >
                ไทย
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs rounded ${language === 'en' ? 'bg-[#F7DC78] text-[#0B0B0F]' : 'bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20'}`}
              >
                EN
              </button>
            </div>

            {/* Export & Clear */}
            <button
              onClick={handleExportChat}
              className="flex items-center gap-2 px-3 py-1 bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20 rounded-lg text-sm hover:border-[#F7DC78]"
              title={t.exportChat}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="flex items-center gap-2 px-3 py-1 bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20 rounded-lg text-sm hover:border-red-500 disabled:opacity-50"
              title={t.clearChat}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Box */}
          <Card variant="gold" className="h-96 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="text-[#E0E5EE]">
                    <p className="text-lg font-bold mb-2">{t.agentChat}</p>
                    <p className="text-sm">{t.askQuestion}</p>
                    <p className="text-xs mt-4 text-[#E0E5EE]/50">Agent: <span className="text-[#F7DC78]">{selectedAgent}</span></p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-[#F7DC78] text-[#0B0B0F]'
                          : 'bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="text-xs mt-2 opacity-70">
                          {msg.toolCalls.map((tool, i) => <div key={i}>🔧 {tool}</div>)}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-[#0B0B0F]/60' : 'text-[#E0E5EE]/50'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20 px-4 py-2 rounded-lg">
                    <p className="text-sm animate-pulse">{t.thinking}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleChatSubmit()}
              placeholder={t.askQuestion}
              disabled={chatLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a24] text-[#F8FAFC] border border-[#F7DC78]/20 focus:outline-none focus:border-[#F7DC78]"
            />
            <Button
              onClick={handleChatSubmit}
              disabled={chatLoading || !chatInput.trim()}
              variant="primary"
              type="button"
            >
              {chatLoading ? '...' : '→'}
            </Button>
          </div>
        </div>
      ),
    },
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
                <p className="text-xs text-[#E0E5EE]">{agent.role}</p>
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

              <label className="flex items-center gap-2 text-sm text-[#E0E5EE] cursor-pointer">
                <input
                  type="checkbox"
                  checked={liveRun}
                  onChange={e => setLiveRun(e.target.checked)}
                  className="accent-[#F7DC78]"
                />
                Live run (persist to DB + settlement attempt) — unchecked = dry run
              </label>

              <Button
                variant="primary"
                size="lg"
                onClick={handleExecute}
                disabled={executing || !job.title}
                type="button"
              >
                {executing ? 'Executing...' : `▶ Execute Orchestration${liveRun ? ' (LIVE)' : ' (dry run)'}`}
              </Button>
            </div>
          </Card>

          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#F7DC78]">
                Execution Result {result.dry_run === false ? '(live)' : '(dry run)'}
              </h3>
              {result.error && (
                <Card variant="default">
                  <p className="text-sm text-red-400">{String(result.error)}</p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Governance"
                  value={result.governance?.approved ? '✓ Approved' : '✗ Blocked'}
                  variant="success"
                  icon={<CheckCircle className="w-5 h-5" />}
                />
                <StatCard
                  label="Quality Score"
                  value={result.execution ? `${result.execution.qualityScore}%` : '—'}
                  variant="info"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
                <StatCard
                  label="Verification"
                  value={result.verification ? (result.verification.passed ? '✓ Passed' : '✗ Failed') : '—'}
                  variant="success"
                />
                <StatCard
                  label="Reputation"
                  value={result.reputation ? `${result.reputation.reputationChange >= 0 ? '+' : ''}${result.reputation.reputationChange}` : '—'}
                  variant="warning"
                  icon={<Users className="w-5 h-5" />}
                />
              </div>

              {result.planHash && (
                <Card variant="default">
                  <div className="space-y-2">
                    <p className="text-xs text-[#E0E5EE] uppercase tracking-widest font-semibold">Plan Hash</p>
                    <p className="font-mono text-sm text-[#F7DC78] break-all">{result.planHash}</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'discover',
      label: 'Discover Jobs',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#E0E5EE]">
              {jobsLoading ? 'Discovering live jobs...' : `${liveJobs.length} live jobs from bounty sources`}
            </p>
            <Button variant="secondary" size="sm" onClick={loadJobs} disabled={jobsLoading} type="button">
              {jobsLoading ? '...' : '↻ Refresh'}
            </Button>
          </div>
          {!jobsLoading && liveJobs.length === 0 && (
            <Card variant="default">
              <p className="text-sm text-[#E0E5EE]">
                No live jobs returned from /api/trinity/discover right now. Try refresh — sources are GitHub bounties and Immunefi.
              </p>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {liveJobs.map(j => (
              <Card key={j.id} variant="gold">
                <div className="space-y-3">
                  <h4 className="font-bold text-[#F8FAFC]">{j.title}</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>{j.platform}</Badge>
                    <Badge>
                      {j.difficulty === 'easy' ? '⭐ Easy' : j.difficulty === 'medium' ? '⭐⭐ Medium' : '⭐⭐⭐ Hard'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#E0E5EE]">{j.reward} {j.currency}</p>
                  <Button variant="secondary" size="sm" onClick={() => handleUseJob(j)} type="button">
                    Use Job
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'history',
      label: 'History',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#E0E5EE]">
              {historyLoading ? 'Loading history...' : `${historyRows.length} executions from database`}
            </p>
            <Button variant="secondary" size="sm" onClick={loadHistory} disabled={historyLoading} type="button">
              {historyLoading ? '...' : '↻ Refresh'}
            </Button>
          </div>
          {!historyLoading && historyRows.length === 0 ? (
            <Card variant="default">
              <p className="text-sm text-[#E0E5EE]">
                No execution history yet. Run a live orchestration to record the first execution.
              </p>
            </Card>
          ) : (
            <Table
              columns={[
                { key: 'jobTitle', label: 'Job Title', align: 'left' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (status: unknown) => (
                    <Badge>
                      {status === 'success' ? '✓ Success' : status === 'pending' ? '⏳ Pending' : '✗ Failed'}
                    </Badge>
                  ),
                },
                { key: 'execTimeMs', label: 'Time (ms)', align: 'center' },
                { key: 'created', label: 'Created', align: 'right' },
              ]}
              rows={historyRows}
              sortable
            />
          )}
        </div>
      ),
    },
    {
      key: 'team',
      label: t.teamCoordinator,
      content: (
        <div className="space-y-6">
          <Card variant="gold">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#F7DC78] mb-2">{t.taskTitle}</label>
                <input
                  type="text"
                  value={teamTask.title}
                  onChange={e => setTeamTask({ ...teamTask, title: e.target.value })}
                  placeholder="e.g., Audit Smart Contract and Deploy"
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1a24] text-[#F8FAFC] border border-[#F7DC78]/20 focus:outline-none focus:border-[#F7DC78]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#F7DC78] mb-2">{t.taskDescription}</label>
                <textarea
                  value={teamTask.description}
                  onChange={e => setTeamTask({ ...teamTask, description: e.target.value })}
                  placeholder="Describe what the team should do..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1a24] text-[#F8FAFC] border border-[#F7DC78]/20 focus:outline-none focus:border-[#F7DC78]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#F7DC78] mb-3">{t.selectAgents}</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {agents.map(agent => (
                    <button
                      key={agent.name}
                      onClick={() => toggleAgentSelection(agent.name)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        selectedAgentsForTeam.includes(agent.name)
                          ? 'bg-[#F7DC78] text-[#0B0B0F]'
                          : 'bg-[#1a1a24] text-[#E0E5EE] border border-[#F7DC78]/20'
                      }`}
                    >
                      <div className="text-2xl mb-1">{agent.emoji}</div>
                      <div className="text-xs font-bold">{agent.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleExecuteTeam}
                disabled={teamExecuting || !teamTask.title || selectedAgentsForTeam.length === 0}
                type="button"
              >
                {teamExecuting ? 'Coordinating...' : `▶ ${t.executeTeam} (${selectedAgentsForTeam.length} agents)`}
              </Button>
            </div>
          </Card>

          {teamWorkflow.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#F7DC78]">{t.teamWorkflow}</h3>
              <div className="space-y-3">
                {teamWorkflow.map((step, idx) => (
                  <Card key={idx} variant="default">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#1a1a24] flex items-center justify-center text-2xl flex-shrink-0">
                        {agents.find(a => a.name === step.agent)?.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-[#F7DC78]">{step.agent}</span>
                          <Badge>
                            {step.status === 'pending'
                              ? '⏳ Pending'
                              : step.status === 'running'
                                ? '🔄 Running'
                                : step.status === 'error'
                                  ? '✗ Error'
                                  : '✓ Done'}
                          </Badge>
                        </div>
                        {step.result && <p className="text-sm text-[#E0E5EE]">{step.result}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {Object.keys(teamResults).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#F7DC78]">Team Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(teamResults).map(([agent, result]) => (
                  <Card key={agent} variant="gold">
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#F8FAFC]">{agent}</h4>
                      <p className="text-sm text-[#E0E5EE]">{result.response}</p>
                      <p className="text-xs text-[#E0E5EE]/50">{result.timestamp}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
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
        <p className="text-[#E0E5EE] mb-4">5-Agent Multi-Agent System for Job Discovery, Execution, Verification & Settlement</p>
        <div className="flex items-center gap-2 text-emerald-400 flex-wrap">
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {isConnected ? '● Live API Connected' : '● Connection Lost'}
          {systemStatus?.flowStats && (
            <span className="text-xs text-[#E0E5EE]/60 ml-3">
              discovered {systemStatus.flowStats.discovered} · in progress {systemStatus.flowStats.inProgress} · verified {systemStatus.flowStats.verified} · paid {systemStatus.flowStats.paid}
            </span>
          )}
          {systemStatus?.milestones && (
            <span className="text-xs ml-3">
              <Badge>M1 {systemStatus.milestones.M1?.status}</Badge>{' '}
              <Badge>M2 {systemStatus.milestones.M2?.status}</Badge>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabsData} defaultTab="chat" />

      {/* Capabilities */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-[#F7DC78] mb-4">Trinity Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">🧠 Mind Agent</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
                <li>• Discover jobs across 6 platforms</li>
                <li>• Filter by category and difficulty</li>
                <li>• Real-time job monitoring</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">✋ Hand Agent</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
                <li>• Execute jobs with deliverables</li>
                <li>• Quality scoring (0-100%)</li>
                <li>• Execution time tracking</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">👁️ Eye Agent</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
                <li>• Verify deliverable quality</li>
                <li>• Blockchain tx validation</li>
                <li>• Issue detection</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">⚡ Nerve Agent</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
                <li>• SOL token settlement</li>
                <li>• Reputation management</li>
                <li>• Tier advancement</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">🦴 Spine Agent</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
                <li>• Deterministic plan hashing</li>
                <li>• DSG governance validation</li>
                <li>• Immutable audit trail</li>
              </ul>
            </div>
          </Card>

          <Card variant="gold">
            <div className="space-y-2">
              <h4 className="font-bold text-[#F7DC78] text-lg">📊 Analytics</h4>
              <ul className="text-sm text-[#E0E5EE] space-y-1">
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
