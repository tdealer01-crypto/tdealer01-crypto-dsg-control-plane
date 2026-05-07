'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  PlayCircle,
  Send,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { GovernedToolPanel } from '@/components/dsg/governed-tools/GovernedToolPanels';
import type { DsgGovernedToolExecutionResult, DsgGovernedToolPreparedRequest, DsgGovernedToolRequest } from '@/lib/dsg/tools/governed-tools';
import { cn } from '@/lib/utils';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code?: string; message?: string } };

type BuilderJob = {
  id: string;
  status: string;
  claimStatus: string;
  goal?: { normalizedGoal: string; goalHash: string; successCriteria: string[]; constraints: string[] };
  prd?: { summary: string };
  proposedPlan?: { steps: Array<{ id: string; title: string; phase: string; riskLevel: string; requiresApproval: boolean; expectedEvidence: string[] }> };
  gateResult?: { status: string; riskLevel: string; approvalRequired: boolean };
  planHash?: string;
  approvalHash?: string;
};

type Handoff = { planHash: string; approvalHash: string; runtimeStatus: string };
type RuntimeEnvironment = { environmentType: string; repository: string; branchName: string; manifestPath: string; evidence: { note: string } };
type Execution = { branchName: string; pullRequestUrl: string; pullRequestNumber: number; repository: string; generatedFiles: Array<{ path: string; evidenceKind: string }>; evidence: { note: string } };
type ToolCall = {
  toolName: string;
  status: string;
  riskLevel: string;
  claimStatus: string;
  environment: RuntimeEnvironment;
  actionLayer: { runtimeAdapter: string; actionLayer: string; permissionVerdict: string; exposedTools: string[]; auditRequired: boolean };
  output: Execution;
  auditEvent: { eventType: string; outcome: string; evidenceRefs: string[]; createdAt: string };
  notification: { title: string; message: string; nextAction: string };
  evidence: { approvalChecked: boolean; planHashChecked: boolean; allowedToolChecked: boolean; environmentReady: boolean; actionLayerReady: boolean; auditWritten: boolean; note: string };
};

const APP_BUILDER_TOOL_NAME = 'dsg.app_builder.launch_agent_runtime';

function shortHash(value?: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-5)}` : 'missing';
}

function readResult<T>(json: ApiResult<T>): T {
  if (!json.ok) throw new Error(json.error?.message || json.error?.code || 'REQUEST_FAILED');
  return json.data;
}

function tone(ok: boolean) {
  return ok
    ? 'border-[#d6a63a]/35 bg-[#d6a63a]/10 text-[#f5d27a]'
    : 'border-[#b4232b]/35 bg-[#b4232b]/10 text-[#ffb4b8]';
}

function StepChip({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2', tone(ok))}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-black">{label}</p>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
      </div>
      <p className="mt-1 truncate font-mono text-[11px] opacity-80">{detail}</p>
    </div>
  );
}

export function AppBuilderAgentRuntimeView() {
  const [workspaceId, setWorkspaceId] = useState('demo-workspace');
  const [actorId, setActorId] = useState('operator');
  const [goal, setGoal] = useState('');
  const [criteria, setCriteria] = useState('');
  const [constraints, setConstraints] = useState('');
  const [job, setJob] = useState<BuilderJob | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [toolCall, setToolCall] = useState<ToolCall | null>(null);
  const [governedPrepared, setGovernedPrepared] = useState<DsgGovernedToolPreparedRequest | null>(null);
  const [governedResult, setGovernedResult] = useState<DsgGovernedToolExecutionResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function api<T>(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-dsg-workspace-id': workspaceId.trim(),
        'x-dsg-actor-id': actorId.trim(),
        ...(init?.headers || {}),
      },
    });
    const json = (await response.json().catch(() => ({ ok: false, error: { message: 'INVALID_JSON_RESPONSE' } }))) as ApiResult<T>;
    if (!response.ok && json.ok) throw new Error(`HTTP_${response.status}`);
    return readResult(json);
  }

  async function governedTool(input: DsgGovernedToolRequest, execute = false) {
    const response = await fetch('/api/dsg/tools', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, execute }),
    });
    const json = (await response.json().catch(() => ({ ok: false, error: { message: 'INVALID_GOVERNED_TOOL_JSON' } }))) as DsgGovernedToolPreparedRequest | DsgGovernedToolExecutionResult;
    if (!response.ok && !('prepared' in json)) throw new Error('GOVERNED_TOOL_PREPARE_FAILED');
    if ('prepared' in json) {
      setGovernedResult(json);
      setGovernedPrepared(json.prepared);
    } else {
      setGovernedResult(null);
      setGovernedPrepared(json);
    }
    return json;
  }

  async function runStep(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'APP_BUILDER_REQUEST_FAILED');
    } finally {
      setBusy(null);
    }
  }

  const createJob = () => runStep('goal', async () => {
    setHandoff(null);
    setToolCall(null);
    setGovernedPrepared(null);
    setGovernedResult(null);
    const data = await api<BuilderJob>('/api/dsg/app-builder/jobs', {
      method: 'POST',
      body: JSON.stringify({
        goal,
        successCriteria: criteria.split('\n').map((x) => x.trim()).filter(Boolean),
        constraints: constraints.split('\n').map((x) => x.trim()).filter(Boolean),
        targetStack: { frontend: 'nextjs', backend: 'next-api', database: 'supabase-postgres', auth: 'none', deploy: 'vercel' },
      }),
    });
    setJob(data);
  });

  const createPlan = () => runStep('plan', async () => {
    if (!job) throw new Error('APP_BUILDER_JOB_REQUIRED');
    setHandoff(null);
    setToolCall(null);
    const plannedJob = await api<BuilderJob>(`/api/dsg/app-builder/jobs/${job.id}/plan`, { method: 'POST' });
    setJob(plannedJob);
    await governedTool({
      tool: 'plan',
      action: 'dry_run',
      goal: plannedJob.goal?.normalizedGoal || goal || 'Review App Builder plan before runtime handoff',
      args: {
        title: plannedJob.prd?.summary || 'App Builder governed plan',
        jobId: plannedJob.id,
        planHash: plannedJob.planHash,
        steps: plannedJob.proposedPlan?.steps ?? [],
      },
      evidence: [plannedJob.planHash ? `plan_hash:${plannedJob.planHash}` : 'plan_hash:pending'],
      history: ['ui:createPlan'],
    });
  });

  const approvePlan = () => runStep('approval', async () => {
    if (!job?.proposedPlan) throw new Error('APP_BUILDER_PLAN_REQUIRED');
    setHandoff(null);
    setToolCall(null);
    setJob(await api<BuilderJob>(`/api/dsg/app-builder/jobs/${job.id}/approval`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVE', reason: 'Approved visible App Builder plan before runtime action.' }),
    }));
  });

  const createHandoff = () => runStep('handoff', async () => {
    if (!job?.approvalHash) throw new Error('APP_BUILDER_APPROVAL_REQUIRED');
    const handoffDraft = await api<Handoff>(`/api/dsg/app-builder/jobs/${job.id}/runtime-handoff`, { method: 'POST' });
    setHandoff(handoffDraft);
    await governedTool({
      tool: 'workflow',
      action: 'dry_run',
      goal: job.goal?.normalizedGoal || goal || 'Review runtime handoff workflow before execution',
      args: {
        title: 'App Builder runtime handoff',
        jobId: job.id,
        planHash: handoffDraft.planHash,
        approvalHash: handoffDraft.approvalHash,
        runtimeStatus: handoffDraft.runtimeStatus,
      },
      evidence: [`plan_hash:${handoffDraft.planHash}`, `approval_hash:${handoffDraft.approvalHash}`],
      history: ['ui:createHandoff'],
    });
  });

  const launchRuntimeTool = () => runStep('tool-call', async () => {
    if (!job?.approvalHash) throw new Error('APP_BUILDER_APPROVAL_REQUIRED');
    const data = await api<{ job: BuilderJob; toolCall: ToolCall }>(`/api/dsg/app-builder/jobs/${job.id}/tool-call`, {
      method: 'POST',
      body: JSON.stringify({ toolName: APP_BUILDER_TOOL_NAME, arguments: { mode: 'agent_runtime_fullstack_pr' } }),
    });
    setJob(data.job);
    setToolCall(data.toolCall);
  });

  const gateBlocked = job?.gateResult?.status === 'BLOCK';
  const execution = toolCall?.output;
  const stepState = useMemo(() => [
    { label: 'Goal', ok: Boolean(job?.goal), detail: shortHash(job?.goal?.goalHash) },
    { label: 'Plan', ok: Boolean(job?.proposedPlan), detail: job?.gateResult ? `${job.gateResult.status}/${job.gateResult.riskLevel}` : 'missing' },
    { label: 'Approval', ok: Boolean(job?.approvalHash), detail: shortHash(job?.approvalHash) },
    { label: 'Handoff', ok: Boolean(handoff), detail: handoff?.runtimeStatus ?? 'missing' },
    { label: 'Runtime', ok: Boolean(toolCall), detail: toolCall?.status ?? 'missing' },
    { label: 'Audit', ok: Boolean(toolCall?.evidence.auditWritten), detail: toolCall ? `${toolCall.auditEvent.evidenceRefs.length} refs` : 'missing' },
  ], [handoff, job, toolCall]);

  return (
    <div className="space-y-3 text-[#c8c8c8]">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] px-3 py-2">
        <div>
          <p className="text-sm font-black text-[#f2f2f2]">App Builder Agent</p>
          <p className="text-xs text-[#8d8d8d]">คุยงาน → ล็อกเป้าหมาย → สร้างแผน → อนุมัติ → ส่งเข้ารันไทม์</p>
        </div>
        <span className="rounded-full border border-[#d6a63a]/25 px-3 py-1 text-xs font-black text-[#d6a63a]">
          {job?.status ?? 'NO_JOB'} · {job?.claimStatus ?? 'NO_CLAIM'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {stepState.map((item) => <StepChip key={item.label} {...item} />)}
      </div>

      {error && (
        <div className="rounded-xl border border-[#b4232b]/35 bg-[#b4232b]/10 p-3 text-sm text-[#ffb4b8]">
          <AlertCircle className="mr-2 inline h-4 w-4" />{error}
        </div>
      )}

      <div className="grid min-h-[620px] gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-w-0 flex-col rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d]">
          <div className="grid gap-2 border-b border-[#c8c8c8]/15 p-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-[#8d8d8d]">
              Workspace
              <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="h-9 w-full rounded-lg border border-[#c8c8c8]/15 bg-[#111113] px-3 text-sm text-[#f2f2f2] outline-none focus:border-[#d6a63a]/50" />
            </label>
            <label className="space-y-1 text-xs text-[#8d8d8d]">
              Actor
              <input value={actorId} onChange={(e) => setActorId(e.target.value)} className="h-9 w-full rounded-lg border border-[#c8c8c8]/15 bg-[#111113] px-3 text-sm text-[#f2f2f2] outline-none focus:border-[#d6a63a]/50" />
            </label>
          </div>

          <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <label className="flex min-h-[300px] flex-col gap-2 text-xs text-[#8d8d8d]">
              เป้าหมายงาน / Goal
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="พิมพ์งานที่ต้องการให้เอเจนต์ช่วยสร้าง เช่น สร้างแอป todo ที่มีหลักฐาน runtime, audit และ PR จริง"
                className="min-h-[360px] flex-1 resize-none rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3 text-sm leading-6 text-[#f2f2f2] outline-none placeholder:text-[#666] focus:border-[#d6a63a]/50"
              />
            </label>

            <div className="space-y-3">
              <label className="block space-y-2 text-xs text-[#8d8d8d]">
                เกณฑ์สำเร็จ / Success criteria
                <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="หนึ่งบรรทัดต่อหนึ่งเกณฑ์" rows={7} className="w-full resize-none rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3 text-xs leading-5 text-[#f2f2f2] outline-none placeholder:text-[#666] focus:border-[#d6a63a]/50" />
              </label>
              <label className="block space-y-2 text-xs text-[#8d8d8d]">
                ข้อจำกัด / Constraints
                <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="เช่น ไม่เคลม production verified ถ้ายังไม่มี proof" rows={7} className="w-full resize-none rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3 text-xs leading-5 text-[#f2f2f2] outline-none placeholder:text-[#666] focus:border-[#d6a63a]/50" />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#c8c8c8]/15 p-3">
            <button onClick={createJob} disabled={!!busy || !goal.trim()} className="inline-flex items-center gap-2 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:border-[#c8c8c8]/10 disabled:bg-[#111113] disabled:text-[#666]">
              {busy === 'goal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Lock goal
            </button>
            <button onClick={createPlan} disabled={!!busy || !job} className="inline-flex items-center gap-2 rounded-xl border border-[#c8c8c8]/20 px-3 py-2 text-xs font-black text-[#d9d9d9] disabled:text-[#666]">
              {busy === 'plan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PRD + plan
            </button>
            <button onClick={approvePlan} disabled={!!busy || !job?.proposedPlan || gateBlocked} className="inline-flex items-center gap-2 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:border-[#c8c8c8]/10 disabled:bg-[#111113] disabled:text-[#666]">
              {busy === 'approval' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve
            </button>
            <button onClick={createHandoff} disabled={!!busy || !job?.approvalHash} className="inline-flex items-center gap-2 rounded-xl border border-[#c8c8c8]/20 px-3 py-2 text-xs font-black text-[#d9d9d9] disabled:text-[#666]">
              {busy === 'handoff' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Handoff
            </button>
            <button onClick={launchRuntimeTool} disabled={!!busy || !job?.approvalHash || job.status !== 'READY_FOR_RUNTIME'} className="inline-flex items-center gap-2 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:border-[#c8c8c8]/10 disabled:bg-[#111113] disabled:text-[#666]">
              {busy === 'tool-call' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} Launch tool
            </button>
          </div>
        </section>

        <aside className="space-y-3 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3">
          <GovernedToolPanel prepared={governedPrepared} result={governedResult} busy={busy === 'governed-tool'} />
          <div className="flex items-start gap-2 rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3 text-xs leading-5 text-[#d9d9d9]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d6a63a]" />
            <p>จอนี้ใช้ endpoint จริงของ repo เท่านั้น ไม่มี mock result และจะไม่เคลม production verified จนกว่าจะมี proof ครบ</p>
          </div>

          {job?.prd?.summary && (
            <section className="rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3">
              <p className="text-xs font-black text-[#f2f2f2]">PRD summary</p>
              <p className="mt-2 text-xs leading-5 text-[#c8c8c8]">{job.prd.summary}</p>
            </section>
          )}

          {job?.proposedPlan && (
            <section className="space-y-2 rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3">
              <p className="text-xs font-black text-[#f2f2f2]">Plan steps</p>
              {job.proposedPlan.steps.map((step) => (
                <div key={step.id} className="rounded-lg border border-[#c8c8c8]/10 p-2">
                  <p className="text-[11px] font-mono text-[#8d8d8d]">{step.id} · {step.phase} · {step.riskLevel}</p>
                  <p className="mt-1 text-xs font-bold text-[#d9d9d9]">{step.title}</p>
                  <p className="mt-1 text-[11px] text-[#8d8d8d]">Evidence: {step.expectedEvidence.join(', ') || 'missing'}</p>
                </div>
              ))}
            </section>
          )}

          {toolCall && (
            <section className="rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3 text-xs leading-5 text-[#f5d27a]">
              <p className="font-black">App Builder tool finished</p>
              <p className="mt-2 font-mono">{toolCall.toolName}</p>
              <p>Manifest: {toolCall.environment.manifestPath}</p>
              <p>Audit written: {String(toolCall.evidence.auditWritten)}</p>
              <p className="mt-2 text-[#d9d9d9]">{toolCall.evidence.note}</p>
            </section>
          )}

          {execution && (
            <section className="rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3 text-xs leading-5 text-[#f5d27a]">
              <p className="font-black">Implementation PR</p>
              <p className="mt-2">Repo: {execution.repository}</p>
              <p>Branch: {execution.branchName}</p>
              <p>Files: {execution.generatedFiles.length}</p>
              <a href={execution.pullRequestUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 underline">
                Open PR #{execution.pullRequestNumber}<ExternalLink className="h-3.5 w-3.5" />
              </a>
            </section>
          )}

          {!job && (
            <section className="rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3 text-xs leading-5 text-[#8d8d8d]">
              เริ่มจากพิมพ์เป้าหมายงานจริงในช่องใหญ่ แล้วกด Lock goal ระบบจะแสดงเฉพาะสถานะที่ได้จาก API จริง
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
