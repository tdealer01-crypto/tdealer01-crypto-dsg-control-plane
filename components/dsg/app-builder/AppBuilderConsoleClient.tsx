'use client';

import { useMemo, useState } from 'react';
import { PRDViewer } from './PRDViewer';
import { PlanObserverPanel } from './PlanObserverPanel';
import { HandoffPanel } from './HandoffPanel';
import { RuntimeGatePanel } from './RuntimeGatePanel';
import type { DsgAppBuilderPrd } from '@/lib/dsg/app-builder/types/prd';
import type { DsgAppTemplate } from '@/lib/dsg/app-builder/templates/template-registry';
import type { DsgPlanDraft, DsgPlanObserverResult } from '@/lib/dsg/app-builder/plan/types';
import type { DsgAppBuilderApprovalGate, DsgRuntimeHandoffDraft } from '@/lib/dsg/app-builder/approval/types';
import type { RuntimeExecutionGateResult } from '@/lib/dsg/app-builder/runtime/types';

type PrdResponse = {
  ok: boolean;
  prd?: DsgAppBuilderPrd;
  selectedTemplate?: DsgAppTemplate;
  templateCandidates?: DsgAppTemplate[];
  boundary?: { claimStatus: string; productionReadyClaim: boolean; modelUsed?: boolean; note?: string };
  error?: { code: string; message: string };
};

type PlanResponse = {
  ok: boolean;
  plan?: DsgPlanDraft;
  observer?: DsgPlanObserverResult;
  boundary?: { claimStatus: string; productionReadyClaim: boolean; runtimeExecutionReady: boolean; z3RuntimeProof?: boolean };
  error?: { code: string; message: string };
};

type HandoffResponse = {
  ok: boolean;
  approvalGate?: DsgAppBuilderApprovalGate;
  handoff?: DsgRuntimeHandoffDraft;
  error?: { code: string; message: string };
};

type RuntimeGateResponse = RuntimeExecutionGateResult | { ok: false; error: { code: string; message: string } };

type JobResponse = {
  ok: boolean;
  data?: { id?: string; status?: string; claimStatus?: string };
  error?: { code: string; message: string };
};

type AgentLoopResponse = {
  ok?: boolean;
  error?: { code: string; message: string };
  jobId?: string;
  phase?: string;
  risk?: { risk: string; state: string; reasons: string[] };
  benefit?: { ok: boolean; userBenefit: string; easier: boolean; tangibleOutput: string; nextAction: string; missing: string[] };
  truthBoundary?: { ok: boolean; blockedReasons: string[]; productionReadyClaim: false; note: string };
  contextPack?: { id: string; contextHash: string; gateStatus: string; gateReasons: string[]; contextText: string } | null;
  memories?: Array<{ id: string; kind: string; trust: string; status: string; summary: string }>;
  nextActions?: string[];
  verifiedInput?: { status: string; hash: string; evidence: string[] };
  productionReadyClaim?: false;
};

type PreviewMode = 'concept' | 'live' | 'monitor' | 'brain';

const liveGeneratedAppPath = '/generated-apps/2f3b20b0-824c-4d4a-ae6a-250bd18f3392';

const dsgHeaders = {
  'content-type': 'application/json',
  'x-dsg-workspace-id': 'demo-workspace',
  'x-dsg-actor-id': 'operator-ui',
  'x-dsg-actor-role': 'operator',
  'x-dsg-permissions': 'memory:read,memory:write',
};

const starterApps = [
  {
    label: 'เกม ABC เด็ก 3 ขวบ',
    goal: 'สร้างเกม ABC สำหรับเด็ก 3 ขวบ มีรูปภาพ A B C ปุ่มใหญ่ แตะง่าย มีคะแนน เล่นใหม่ได้ และบันทึกคะแนนลงฐานข้อมูล',
    criteria: ['เด็กแตะ A/B/C ได้ง่ายบนมือถือ', 'มี feedback ถูก/ผิดทันที', 'บันทึกคะแนนลงฐานข้อมูล', 'เปิดหน้า deploy แล้วเล่นได้จริง'],
  },
  {
    label: 'ระบบจองคิวร้าน',
    goal: 'สร้างแอปจองคิวสำหรับร้านเล็ก ลูกค้าเลือกวันเวลา เจ้าของร้านเห็นรายการจอง และบันทึกลงฐานข้อมูล',
    criteria: ['ลูกค้าจองคิวได้', 'เจ้าของร้านเห็นคิวล่าสุด', 'ข้อมูลอยู่ในฐานข้อมูล', 'มีสถานะยืนยันหรือรอตรวจ'],
  },
  {
    label: 'CRM ทีมเล็ก',
    goal: 'สร้าง CRM ง่ายๆ สำหรับทีมเล็ก มีรายชื่อลูกค้า งานที่ต้องติดตาม โน้ต และสถานะดีล',
    criteria: ['เพิ่มลูกค้าได้', 'เพิ่มงานติดตามได้', 'กรองสถานะได้', 'มีหลักฐานการบันทึกข้อมูล'],
  },
  {
    label: 'แดชบอร์ดรายรับ',
    goal: 'สร้างแดชบอร์ดรายรับแบบง่าย กรอกยอดขายรายวัน ดูยอดรวม และเห็นรายการย้อนหลังสำหรับเจ้าของร้าน',
    criteria: ['เพิ่มยอดขายรายวันได้', 'เห็นยอดรวม', 'เห็นรายการย้อนหลัง', 'มี proof ว่า backend/database ใช้งานได้'],
  },
];

function statusTone(status: string) {
  if (status.includes('BLOCK') || status.includes('FAILED') || status.includes('REQUIRED')) return 'border-rose-400/40 bg-rose-500/10 text-rose-100';
  if (status.includes('JOB_CREATED') || status.includes('PRD') || status.includes('PLAN') || status.includes('APPROVED') || status.includes('PASS')) return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
}

function stateTone(state: string) {
  if (state.includes('BLOCK') || state.includes('REQUIRED') || state.includes('NOT_CONFIGURED')) return 'border-rose-400/40 bg-rose-500/10 text-rose-100';
  if (state.includes('ready') || state.includes('APPROVED') || state.includes('created') || state.includes('PASS')) return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  return 'border-slate-700 bg-slate-950 text-slate-300';
}

function extractCreatedJobId(url: string | null) {
  if (!url) return 'ui-agent-loop';
  return url.split('/').filter(Boolean).at(-1) || 'ui-agent-loop';
}

export function AppBuilderConsoleClient({ initialPrd }: { initialPrd: DsgAppBuilderPrd }) {
  const [goal, setGoal] = useState('Build a CRM dashboard for small teams with contacts, tasks, notes, and workspace roles.');
  const [criteria, setCriteria] = useState('User can create records\nUser can see saved data\nBackend/API/database proof is visible\nProduction claim stays blocked until evidence exists');
  const [prd, setPrd] = useState(initialPrd);
  const [plan, setPlan] = useState<DsgPlanDraft | null>(null);
  const [observer, setObserver] = useState<DsgPlanObserverResult | null>(null);
  const [approvalGate, setApprovalGate] = useState<DsgAppBuilderApprovalGate | null>(null);
  const [handoff, setHandoff] = useState<DsgRuntimeHandoffDraft | null>(null);
  const [runtimeGate, setRuntimeGate] = useState<RuntimeExecutionGateResult | null>(null);
  const [agentLoop, setAgentLoop] = useState<AgentLoopResponse | null>(null);
  const [templateName, setTemplateName] = useState('Initial product console');
  const [status, setStatus] = useState('Ready. Pick an example or describe an app, then create a governed job.');
  const [createdJobUrl, setCreatedJobUrl] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('concept');
  const [loadingAgentLoop, setLoadingAgentLoop] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [loadingPrd, setLoadingPrd] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingHandoff, setLoadingHandoff] = useState(false);
  const [loadingRuntimeGate, setLoadingRuntimeGate] = useState(false);

  const criteriaList = useMemo(() => criteria.split('\n').map((line) => line.trim()).filter(Boolean), [criteria]);
  const timeline = useMemo(() => [
    { label: 'Goal', state: goal.trim() ? 'ready' : 'BLOCKED', detail: goal.trim() ? 'User command captured' : 'Goal required' },
    { label: 'Brain loop', state: agentLoop ? (agentLoop.ok ? 'PASS' : 'BLOCK_OR_REVIEW') : 'waiting', detail: agentLoop?.contextPack ? `Memory context ${agentLoop.contextPack.gateStatus}` : 'Run Brain Loop before execution' },
    { label: 'PRD', state: prd ? 'ready' : 'waiting', detail: prd?.title || 'Generate PRD' },
    { label: 'Plan', state: plan ? 'ready' : 'waiting', detail: plan ? 'Plan observer available' : 'Run Plan + Observer' },
    { label: 'Handoff', state: handoff ? handoff.status : 'waiting', detail: handoff ? 'Approval handoff created' : 'Approval required' },
    { label: 'Runtime gate', state: runtimeGate ? runtimeGate.status : 'waiting', detail: runtimeGate ? runtimeGate.status : 'Not executed' },
  ], [goal, prd, plan, handoff, runtimeGate, agentLoop]);

  function applyStarter(app: (typeof starterApps)[number]) {
    setGoal(app.goal);
    setCriteria(app.criteria.join('\n'));
    setPreviewMode('concept');
    setCreatedJobUrl(null);
    setAgentLoop(null);
    setStatus(`Loaded example: ${app.label}. Review the goal, then run Brain Loop or create a governed job.`);
  }

  async function runAgentLoop(phase = 'planning') {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setStatus('APP_BUILDER_GOAL_REQUIRED');
      return;
    }

    setLoadingAgentLoop(true);
    setStatus('Running memory-backed DSG Brain Loop…');
    try {
      const response = await fetch('/api/dsg/app-builder/agent-loop', {
        method: 'POST',
        headers: dsgHeaders,
        body: JSON.stringify({
          jobId: extractCreatedJobId(createdJobUrl),
          phase,
          goal: trimmedGoal,
          successCriteria: criteriaList,
          history: timeline.map((item) => `${item.label}:${item.state}`),
        }),
      });
      const json = (await response.json()) as AgentLoopResponse;
      if (!response.ok || json.error) throw new Error(json.error?.message || 'APP_BUILDER_AGENT_LOOP_FAILED');
      setAgentLoop(json);
      setPreviewMode('brain');
      setStatus(`${json.ok ? 'AGENT_LOOP_PASS' : 'AGENT_LOOP_REVIEW'} · memory=${json.memories?.length || 0} · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'APP_BUILDER_AGENT_LOOP_FAILED');
    } finally {
      setLoadingAgentLoop(false);
    }
  }

  async function createGovernedJob() {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setStatus('APP_BUILDER_GOAL_REQUIRED');
      return;
    }

    setLoadingJob(true);
    setCreatedJobUrl(null);
    setStatus('Creating governed App Builder job…');
    try {
      const response = await fetch('/api/dsg/app-builder/jobs', {
        method: 'POST',
        headers: dsgHeaders,
        body: JSON.stringify({
          goal: trimmedGoal,
          successCriteria: criteriaList,
          targetStack: { frontend: 'nextjs', backend: 'next-api', database: 'supabase-postgres', auth: 'none', deploy: 'vercel' },
          constraints: ['no production-ready claim without build/deploy/evidence proof', 'no mock data presented as production evidence', 'show a user-visible next action when blocked'],
          userNotes: 'Self-service builder job. App-builder UX reference: command, live preview, monitor, and evidence panel in one workspace.',
        }),
      });
      const json = (await response.json()) as JobResponse;
      if (!response.ok || !json.ok || !json.data?.id) throw new Error(json.error?.message || 'APP_BUILDER_JOB_CREATE_FAILED');
      const url = `/dsg/app-builder/${json.data.id}`;
      setCreatedJobUrl(url);
      setStatus(`${json.data.status || 'JOB_CREATED'} · claim=${json.data.claimStatus || 'PLANNED_ONLY'} · next=open job timeline`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'APP_BUILDER_JOB_CREATE_FAILED');
    } finally {
      setLoadingJob(false);
    }
  }

  async function generatePrd() {
    setLoadingPrd(true);
    setStatus('Generating deterministic PRD draft…');
    try {
      const response = await fetch('/api/dsg/app-builder/prd', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal }) });
      const json = (await response.json()) as PrdResponse;
      if (!response.ok || !json.ok || !json.prd) throw new Error(json.error?.message || 'APP_BUILDER_PRD_FAILED');
      setPrd(json.prd);
      setPlan(null);
      setObserver(null);
      setApprovalGate(null);
      setHandoff(null);
      setRuntimeGate(null);
      setTemplateName(json.selectedTemplate?.name || 'Template selected');
      setStatus(`${json.boundary?.claimStatus || 'PRD_DRAFT_ONLY'} · modelUsed=${json.boundary?.modelUsed ? 'true' : 'false'} · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'APP_BUILDER_PRD_FAILED');
    } finally {
      setLoadingPrd(false);
    }
  }

  async function generatePlan() {
    setLoadingPlan(true);
    setStatus('Deriving plan draft and running observer…');
    try {
      const response = await fetch('/api/dsg/app-builder/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prd }) });
      const json = (await response.json()) as PlanResponse;
      if (!response.ok || !json.ok || !json.plan || !json.observer) throw new Error(json.error?.message || 'APP_BUILDER_PLAN_FAILED');
      setPlan(json.plan);
      setObserver(json.observer);
      setApprovalGate(null);
      setHandoff(null);
      setRuntimeGate(null);
      setStatus(`${json.boundary?.claimStatus || 'PLAN_DRAFT_ONLY'} · observer=${json.observer.status} · z3RuntimeProof=${json.boundary?.z3RuntimeProof ? 'true' : 'false'} · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'APP_BUILDER_PLAN_FAILED');
    } finally {
      setLoadingPlan(false);
    }
  }

  async function createHandoff() {
    if (!plan || !observer) {
      setStatus('APP_BUILDER_PLAN_OBSERVER_REQUIRED');
      return;
    }
    setLoadingHandoff(true);
    setStatus('Evaluating approval gate and creating runtime handoff draft…');
    try {
      const response = await fetch('/api/dsg/app-builder/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan, observer }) });
      const json = (await response.json()) as HandoffResponse;
      if (!response.ok || !json.ok || !json.approvalGate || !json.handoff) throw new Error(json.error?.message || 'APP_BUILDER_HANDOFF_FAILED');
      setApprovalGate(json.approvalGate);
      setHandoff(json.handoff);
      setRuntimeGate(null);
      setStatus(`${json.handoff.status} · runtimeExecutionStarted=false · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'APP_BUILDER_HANDOFF_FAILED');
    } finally {
      setLoadingHandoff(false);
    }
  }

  async function startRuntimeGate() {
    if (!handoff || !plan) {
      setStatus('RUNTIME_HANDOFF_REQUIRED');
      return;
    }
    setLoadingRuntimeGate(true);
    setStatus('Evaluating fail-closed runtime execution gate…');
    try {
      const requiredSecrets = Array.from(new Set(plan.actions.flatMap((action) => action.requiredSecrets)));
      const response = await fetch('/api/dsg/app-builder/runtime/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handoff,
          approval: { status: approvalGate?.approved ? 'APPROVED' : approvalGate?.status || 'BLOCKED', signatureValid: approvalGate?.approved === true },
          secrets: { exists: false, expired: true, requiredSecrets, availableSecrets: [] },
          executorPool: { available: 0, health: 'NOT_CONFIGURED', mode: 'vercel-serverless-gate-only' },
          proofBundle: { requiredFields: ['audit_export', 'evidence_manifest', 'deployment_proof', 'auth_rbac_proof'], presentFields: [], hashChainValid: false },
        }),
      });
      const json = (await response.json()) as RuntimeGateResponse;
      if (!response.ok || !json.ok) throw new Error('error' in json ? json.error.message : 'RUNTIME_EXECUTION_GATE_FAILED');
      setRuntimeGate(json);
      setStatus(`${json.status} · runtimeExecutionStarted=false · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'RUNTIME_EXECUTION_GATE_FAILED');
    } finally {
      setLoadingRuntimeGate(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Self-service App Builder</p>
              <h2 className="mt-2 text-2xl font-black text-slate-100">ไม่ต้องรอคนมาทำให้ — สั่งงานและดูพรีวิวข้างๆ</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">เลือกตัวอย่างหรือพิมพ์แอปที่ต้องการ แล้วดู PRD, plan, monitor, preview และ evidence ใน workspace เดียว.</p>
            </div>
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">EVIDENCE_FIRST</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {starterApps.map((app) => (
              <button key={app.label} onClick={() => applyStarter(app)} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-indigo-400/50 hover:bg-indigo-500/10">
                <p className="font-black text-slate-100">{app.label}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{app.goal}</p>
              </button>
            ))}
          </div>

          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-5 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-indigo-500" placeholder="Describe the app you want DSG to build…" />
          <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} className="mt-3 min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-indigo-500" placeholder="Success criteria, one per line…" />

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <button onClick={() => void runAgentLoop('planning')} disabled={loadingAgentLoop} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{loadingAgentLoop ? 'Thinking…' : 'Run Brain Loop'}</button>
            <button onClick={() => void createGovernedJob()} disabled={loadingJob} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">{loadingJob ? 'Creating job…' : 'Create governed job'}</button>
            <button onClick={() => void generatePrd()} disabled={loadingPrd} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{loadingPrd ? 'Generating…' : 'Generate PRD'}</button>
            <button onClick={() => void generatePlan()} disabled={loadingPlan} className="rounded-2xl border border-violet-400/40 bg-violet-500/10 px-5 py-3 text-sm font-black text-violet-100 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60">{loadingPlan ? 'Observing…' : 'Plan + Observer'}</button>
            <button onClick={() => void createHandoff()} disabled={loadingHandoff || !plan || !observer} className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">{loadingHandoff ? 'Hashing…' : 'Approval + Handoff'}</button>
            <button onClick={() => void startRuntimeGate()} disabled={loadingRuntimeGate || !handoff} className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-5 py-3 text-sm font-black text-rose-100 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60">{loadingRuntimeGate ? 'Checking…' : 'Start Runtime Gate'}</button>
          </div>

          <div className={`mt-4 rounded-2xl border p-3 text-xs font-mono ${statusTone(status)}`}>
            <p>{status}</p>
            {createdJobUrl ? <a href={createdJobUrl} className="mt-2 inline-flex rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 font-bold text-emerald-100 hover:bg-emerald-500/20">Open job timeline: {createdJobUrl}</a> : null}
          </div>
        </section>

        <PRDViewer prd={prd} />
        {plan && observer && <PlanObserverPanel plan={plan} observer={observer} />}
        {approvalGate && handoff && <HandoffPanel approvalGate={approvalGate} handoff={handoff} />}
        {runtimeGate && <RuntimeGatePanel result={runtimeGate} />}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5 shadow-2xl shadow-indigo-950/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">Live Preview</p>
              <h2 className="mt-1 text-2xl font-black text-white">พรีวิวแอปข้างๆ</h2>
            </div>
            <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1 text-xs font-bold">
              {(['concept', 'live', 'monitor', 'brain'] as PreviewMode[]).map((mode) => (
                <button key={mode} onClick={() => setPreviewMode(mode)} className={`rounded-xl px-3 py-2 ${previewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{mode}</button>
              ))}
            </div>
          </div>

          {previewMode === 'concept' ? (
            <div className="mt-5 rounded-[2rem] border border-slate-800 bg-slate-950 p-4">
              <div className="rounded-[1.5rem] border border-slate-800 bg-gradient-to-br from-indigo-950 to-slate-950 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Concept screen</p>
                <h3 className="mt-3 text-2xl font-black text-white">{prd.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{prd.summary}</p>
                <div className="mt-5 grid gap-3">
                  {criteriaList.slice(0, 4).map((item) => <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">✓ {item}</div>)}
                </div>
              </div>
            </div>
          ) : null}

          {previewMode === 'live' ? (
            <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950">
              <iframe title="Generated app live preview" src={liveGeneratedAppPath} className="h-[620px] w-full bg-slate-950" />
              <a href={liveGeneratedAppPath} className="block border-t border-slate-800 px-4 py-3 text-sm font-bold text-indigo-200 hover:bg-slate-900">Open generated app full page</a>
            </div>
          ) : null}

          {previewMode === 'monitor' ? (
            <div className="mt-5 space-y-3">
              {timeline.map((item) => (
                <div key={item.label} className={`rounded-2xl border p-4 ${stateTone(String(item.state))}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white">{item.label}</p>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs">{item.state}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-85">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : null}

          {previewMode === 'brain' ? (
            <div className="mt-5 space-y-4">
              {agentLoop ? (
                <>
                  <div className={`rounded-2xl border p-4 ${stateTone(agentLoop.ok ? 'PASS' : 'BLOCK')}`}>
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Brain decision</p>
                    <p className="mt-2 text-2xl font-black text-white">{agentLoop.ok ? 'PASS' : 'REVIEW / BLOCK'}</p>
                    <p className="mt-2 text-xs leading-5 opacity-85">Risk: {agentLoop.risk?.state || 'unknown'} · productionReadyClaim=false</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Context pack</p>
                    <p className="mt-2 break-all text-xs text-slate-300">{agentLoop.contextPack?.contextHash || 'No context pack hash'}</p>
                    <p className="mt-2 text-xs text-slate-400">Gate: {agentLoop.contextPack?.gateStatus || 'unavailable'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Next actions</p>
                    <div className="mt-3 space-y-2">
                      {(agentLoop.nextActions || []).map((action) => <p key={action} className="rounded-xl bg-slate-900 p-2 text-xs text-slate-300">{action}</p>)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Memory used</p>
                    <div className="mt-3 space-y-2">
                      {(agentLoop.memories || []).length ? (agentLoop.memories || []).map((memory) => <p key={memory.id} className="rounded-xl bg-slate-900 p-2 text-xs leading-5 text-slate-300">[{memory.kind}/{memory.trust}] {memory.summary}</p>) : <p className="text-xs text-slate-500">No allowed memory returned yet.</p>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  Run Brain Loop first. It will search memory, create context pack, evaluate risk, record audit, and return next actions here.
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">User next action</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <p className="rounded-2xl bg-slate-950 p-3">1. Describe app or pick example.</p>
            <p className="rounded-2xl bg-slate-950 p-3">2. Run Brain Loop to use memory and truth gate.</p>
            <p className="rounded-2xl bg-slate-950 p-3">3. Create governed job.</p>
            <p className="rounded-2xl bg-slate-950 p-3">4. Generate PRD and plan.</p>
            <p className="rounded-2xl bg-slate-950 p-3">5. Approve handoff only when proof is visible.</p>
            <p className="rounded-2xl bg-slate-950 p-3">6. Open live preview and verify output.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
