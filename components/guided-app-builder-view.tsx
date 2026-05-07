'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Send, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code?: string; message?: string } };
type Stage = 'idea' | 'features' | 'style' | 'confirm' | 'planned' | 'approved' | 'runtime' | 'done';
type Msg = { id: string; role: 'agent' | 'user'; text: string };

type BuilderJob = {
  id: string;
  status: string;
  claimStatus: string;
  goal?: { goalHash: string; normalizedGoal: string };
  prd?: { summary: string };
  proposedPlan?: { steps: Array<{ id: string; title: string; phase: string; riskLevel: string; expectedEvidence: string[] }> };
  gateResult?: { status: string; riskLevel: string };
  approvalHash?: string;
};

type Handoff = { runtimeStatus: string; planHash: string; approvalHash: string };
type ToolCall = {
  status: string;
  output: { pullRequestUrl: string; pullRequestNumber: number; repository: string; branchName: string; generatedFiles: unknown[] };
  evidence: { auditWritten: boolean; note: string };
};

const TOOL_NAME = 'dsg.app_builder.launch_agent_runtime';
const stylesBase = ['มือถือก่อน', 'อ่านง่าย', 'เรียบหรู', 'ทอง / แดง / เงิน'];
const constraints = [
  'ห้ามใช้ mock data เป็นหลักฐาน',
  'ห้ามเคลม production verified ถ้ายังไม่มี proof ครบ',
  'ต้องแสดงเฉพาะข้อมูลจาก endpoint จริงหรือแหล่งที่อ้างอิงได้',
  'ต้องออกแบบ mobile-first และอ่านง่าย',
  'ใช้โทนสีทอง แดง และเงินสำหรับสถานะหลัก',
];

function optionsFor(idea: string) {
  const v = idea.toLowerCase();
  if (/todo|task|งาน/.test(v)) return ['เพิ่มงาน', 'แก้งาน', 'ลบงาน', 'ติ๊กว่าเสร็จแล้ว', 'ค้นหางาน', 'กรองงานค้าง'];
  if (/บัญชี|รายรับ|รายจ่าย|expense|income/.test(v)) return ['เพิ่มรายการ', 'แก้รายการ', 'ลบรายการ', 'แยกรายรับ/รายจ่าย', 'แสดงยอดรวม', 'กรองตามเดือน'];
  if (/จอง|queue|booking|คิว/.test(v)) return ['สร้างคิว', 'แก้ไขคิว', 'ยกเลิกคิว', 'ดูตารางเวลา', 'สถานะการจอง', 'แจ้งเตือน'];
  return ['เพิ่มข้อมูล', 'แก้ข้อมูล', 'ลบข้อมูล', 'ดูรายการ', 'ค้นหา', 'แสดงสถานะ'];
}

function readResult<T>(json: ApiResult<T>): T {
  if (!json.ok) throw new Error(json.error?.message || json.error?.code || 'REQUEST_FAILED');
  return json.data;
}

function Chip({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={cn('min-w-[116px] rounded-xl border px-3 py-2', ok ? 'border-[#d6a63a]/35 bg-[#d6a63a]/10 text-[#f5d27a]' : 'border-[#b4232b]/35 bg-[#b4232b]/10 text-[#ffb4b8]')}>
      <div className="flex items-center justify-between gap-2 text-xs font-black">
        <span>{label}</span>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      </div>
      <p className="mt-1 truncate text-[11px] opacity-80">{detail}</p>
    </div>
  );
}

function Pick({ active, text, onClick }: { active: boolean; text: string; onClick: () => void }) {
  return <button onClick={onClick} className={cn('rounded-xl border px-3 py-2 text-xs font-bold', active ? 'border-[#d6a63a]/45 bg-[#d6a63a]/15 text-[#f5d27a]' : 'border-[#c8c8c8]/15 bg-[#111113] text-[#c8c8c8]')}>{active ? '✓ ' : '+ '}{text}</button>;
}

export function GuidedAppBuilderView() {
  const [workspaceId, setWorkspaceId] = useState('demo-workspace');
  const [actorId, setActorId] = useState('operator');
  const [stage, setStage] = useState<Stage>('idea');
  const [input, setInput] = useState('');
  const [idea, setIdea] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>(stylesBase);
  const [notes, setNotes] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([{ id: 'm0', role: 'agent', text: 'อยากสร้างแอปอะไรครับ? พิมพ์สั้น ๆ ก็ได้ เช่น Todo, รายรับรายจ่าย, จองคิว หรือร้านค้า เดี๋ยวผมถามต่อเอง' }]);
  const [job, setJob] = useState<BuilderJob | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [toolCall, setToolCall] = useState<ToolCall | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const featureOptions = useMemo(() => optionsFor(idea), [idea]);
  const goal = useMemo(() => `สร้าง${idea || 'แอปใหม่'} โดยให้ผู้ใช้ทำงานหลักได้: ${(features.length ? features : ['ฟีเจอร์ที่ผู้ใช้เลือก']).join(', ')}. รูปแบบหน้าจอ: ${styles.join(', ')}. ต้องแสดงเฉพาะข้อมูลจริง มีหลักฐานการทำงาน และไม่ใช้ข้อมูลจำลอง.${notes.length ? ` หมายเหตุ: ${notes.join(' | ')}` : ''}`, [features, idea, notes, styles]);
  const criteria = useMemo(() => [...(features.length ? features.map((f) => `ผู้ใช้${f}ได้`) : ['ผู้ใช้ทำงานหลักของแอปได้']), 'หน้าจออ่านง่ายบนมือถือ', 'มีผลลัพธ์หรือหลักฐานที่ตรวจสอบได้'], [features]);

  async function api<T>(path: string, init?: RequestInit) {
    const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', 'x-dsg-workspace-id': workspaceId.trim(), 'x-dsg-actor-id': actorId.trim(), ...(init?.headers || {}) } });
    const json = await res.json().catch(() => ({ ok: false, error: { message: 'INVALID_JSON_RESPONSE' } })) as ApiResult<T>;
    if (!res.ok && json.ok) throw new Error(`HTTP_${res.status}`);
    return readResult(json);
  }

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name); setError(null);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : 'REQUEST_FAILED'); } finally { setBusy(null); }
  }

  function say(role: Msg['role'], text: string) { setMessages((m) => [...m, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text }]); }
  function toggle(value: string, list: string[], setter: (next: string[]) => void) { setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]); }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput(''); say('user', text);
    if (stage === 'idea') {
      const picked = optionsFor(text).slice(0, 4);
      setIdea(text); setFeatures(picked); setStage('features');
      say('agent', `เข้าใจครับ: ${text}. ผมเลือกฟีเจอร์เริ่มต้นให้แล้ว กดเพิ่ม/ลบได้ หรือพิมพ์สิ่งที่อยากเพิ่มมาได้เลย`);
      return;
    }
    setNotes((n) => [...n, text]);
    say('agent', 'รับทราบ ผมเพิ่มเข้า monitor แล้ว ถ้าโอเคให้กดยืนยันเรียก API ได้เลย');
  }

  const buildPlan = () => run('plan', async () => {
    const created = await api<BuilderJob>('/api/dsg/app-builder/jobs', { method: 'POST', body: JSON.stringify({ goal, successCriteria: criteria, constraints, targetStack: { frontend: 'nextjs', backend: 'next-api', database: 'supabase-postgres', auth: 'none', deploy: 'vercel' } }) });
    const planned = await api<BuilderJob>(`/api/dsg/app-builder/jobs/${created.id}/plan`, { method: 'POST' });
    setJob(planned); setStage('planned'); say('agent', 'เรียก API แล้ว: สร้าง PRD และแผนให้แล้วครับ ตรวจใน monitor ถ้าโอเคกดอนุมัติแผน');
  });

  const approve = () => run('approval', async () => {
    if (!job?.proposedPlan) throw new Error('APP_BUILDER_PLAN_REQUIRED');
    const approved = await api<BuilderJob>(`/api/dsg/app-builder/jobs/${job.id}/approval`, { method: 'POST', body: JSON.stringify({ decision: 'APPROVE', reason: 'Approved visible guided plan before runtime action.' }) });
    setJob(approved); setStage('approved'); say('agent', 'อนุมัติแผนแล้วครับ ขั้นต่อไปคือส่งเข้ารันไทม์');
  });

  const sendRuntime = () => run('handoff', async () => {
    if (!job?.approvalHash) throw new Error('APP_BUILDER_APPROVAL_REQUIRED');
    const h = await api<Handoff>(`/api/dsg/app-builder/jobs/${job.id}/runtime-handoff`, { method: 'POST' });
    setHandoff(h); setStage('runtime'); say('agent', 'ส่งเข้ารันไทม์แล้วครับ ถ้าพร้อมกดเริ่มสร้างแอป');
  });

  const launch = () => run('tool-call', async () => {
    if (!job?.approvalHash) throw new Error('APP_BUILDER_APPROVAL_REQUIRED');
    const data = await api<{ job: BuilderJob; toolCall: ToolCall }>(`/api/dsg/app-builder/jobs/${job.id}/tool-call`, { method: 'POST', body: JSON.stringify({ toolName: TOOL_NAME, arguments: { mode: 'agent_runtime_fullstack_pr' } }) });
    setJob(data.job); setToolCall(data.toolCall); setStage('done'); say('agent', 'สร้างแอปเสร็จแล้วครับ ดู PR และหลักฐานใน monitor ได้เลย');
  });

  const steps = [
    { label: 'คุย requirement', ok: Boolean(idea), detail: idea || 'รอเริ่ม' },
    { label: 'แผน', ok: Boolean(job?.proposedPlan), detail: job?.gateResult ? `${job.gateResult.status}/${job.gateResult.riskLevel}` : 'รอสร้าง' },
    { label: 'อนุมัติ', ok: Boolean(job?.approvalHash), detail: job?.approvalHash ? `${job.approvalHash.slice(0, 8)}…` : 'รอ' },
    { label: 'รันไทม์', ok: Boolean(handoff), detail: handoff?.runtimeStatus ?? 'รอส่ง' },
    { label: 'สร้างแอป', ok: Boolean(toolCall), detail: toolCall?.status ?? 'รอเริ่ม' },
  ];

  return <div className="space-y-3 text-[#c8c8c8]">
    <div className="flex gap-2 overflow-x-auto pb-1">{steps.map((s) => <Chip key={s.label} {...s} />)}</div>
    {error ? <div className="rounded-xl border border-[#b4232b]/35 bg-[#b4232b]/10 p-3 text-sm text-[#ffb4b8]">{error}</div> : null}
    <div className="grid min-h-[620px] gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-w-0 flex-col rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d]">
        <div className="border-b border-[#c8c8c8]/15 px-3 py-2"><p className="text-sm font-black text-[#f2f2f2]">App Builder Agent</p><p className="text-xs text-[#8d8d8d]">คุยตกลงก่อน แล้วเอเจนต์ตั้งค่าให้ ก่อนเรียก API ต้องกดยืนยัน</p></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((m) => <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[86%] rounded-2xl border px-3 py-2 text-sm leading-6', m.role === 'user' ? 'border-[#d6a63a]/35 bg-[#d6a63a]/10 text-[#f5d27a]' : 'border-[#c8c8c8]/15 bg-[#111113] text-[#d9d9d9]')}><div className="mb-1 text-[10px] font-black uppercase opacity-70">{m.role === 'agent' ? 'Agent' : 'You'}</div>{m.text}</div></div>)}
          {stage === 'features' ? <div className="rounded-2xl border border-[#c8c8c8]/15 bg-[#111113] p-3"><p className="text-xs font-black text-[#f2f2f2]">ฟีเจอร์ที่ต้องการ</p><div className="mt-2 flex flex-wrap gap-2">{featureOptions.map((f) => <Pick key={f} active={features.includes(f)} text={f} onClick={() => toggle(f, features, setFeatures)} />)}</div><button onClick={() => { setStage('style'); say('agent', 'ต่อไปเลือกสไตล์หน้าจอครับ'); }} className="mt-3 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a]">ต่อไป: เลือกสไตล์</button></div> : null}
          {stage === 'style' ? <div className="rounded-2xl border border-[#c8c8c8]/15 bg-[#111113] p-3"><p className="text-xs font-black text-[#f2f2f2]">สไตล์หน้าจอ</p><div className="mt-2 flex flex-wrap gap-2">{['มือถือก่อน', 'อ่านง่าย', 'เรียบหรู', 'ทอง / แดง / เงิน', 'จอมอนิเตอร์สด'].map((s) => <Pick key={s} active={styles.includes(s)} text={s} onClick={() => toggle(s, styles, setStyles)} />)}</div><button onClick={() => { setStage('confirm'); say('agent', 'ผมสรุปคำสั่งงานให้แล้ว ตรวจใน monitor ถ้าโอเคกดยืนยันเรียก API'); }} className="mt-3 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a]">สรุปให้ตรวจ</button></div> : null}
          {stage === 'confirm' ? <div className="rounded-2xl border border-[#d6a63a]/30 bg-[#d6a63a]/5 p-3"><p className="text-sm font-black text-[#f5d27a]">แบบนี้โอเคไหม?</p><p className="mt-2 text-xs leading-5 text-[#d9d9d9]">ปุ่มนี้จะเรียก API จริง: POST /api/dsg/app-builder/jobs และ POST /api/dsg/app-builder/jobs/:id/plan</p><button onClick={buildPlan} disabled={!!busy} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:opacity-50">{busy === 'plan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ยืนยันและเรียก API สร้างแผน</button></div> : null}
        </div>
        <div className="border-t border-[#c8c8c8]/15 p-3"><div className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder={stage === 'idea' ? 'พิมพ์สั้น ๆ เช่น Todo' : 'พิมพ์สิ่งที่อยากเพิ่มหรือแก้...'} className="h-11 min-w-0 flex-1 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] px-3 text-sm text-[#f2f2f2] outline-none placeholder:text-[#666] focus:border-[#d6a63a]/50" /><button onClick={send} disabled={!input.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 text-xs font-black text-[#f5d27a] disabled:opacity-50"><Send className="h-4 w-4" /> ส่ง</button></div></div>
      </section>
      <aside className="space-y-3 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3"><section className="rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#d6a63a]">Agent settings monitor</p><div className="mt-3 space-y-2"><div className="rounded-lg border border-[#c8c8c8]/10 bg-[#0c0c0d] p-2"><p className="text-[10px] font-black uppercase text-[#8d8d8d]">Goal</p><p className="mt-1 text-xs leading-5 text-[#d9d9d9]">{goal}</p></div><div className="rounded-lg border border-[#c8c8c8]/10 bg-[#0c0c0d] p-2"><p className="text-[10px] font-black uppercase text-[#8d8d8d]">Success criteria</p><ul className="mt-1 space-y-1 text-xs leading-5 text-[#d9d9d9]">{criteria.map((c) => <li key={c}>• {c}</li>)}</ul></div><div className="rounded-lg border border-[#c8c8c8]/10 bg-[#0c0c0d] p-2"><p className="text-[10px] font-black uppercase text-[#8d8d8d]">Constraints</p><ul className="mt-1 space-y-1 text-xs leading-5 text-[#d9d9d9]">{constraints.map((c) => <li key={c}>• {c}</li>)}</ul></div></div></section><div className="grid grid-cols-2 gap-2 text-xs"><label>Workspace<input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#c8c8c8]/15 bg-[#0c0c0d] px-2 text-[#f2f2f2]" /></label><label>Actor<input value={actorId} onChange={(e) => setActorId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#c8c8c8]/15 bg-[#0c0c0d] px-2 text-[#f2f2f2]" /></label></div><div className="flex flex-wrap gap-2"><button onClick={approve} disabled={!!busy || !job?.proposedPlan} className="rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:opacity-40">อนุมัติแผน</button><button onClick={sendRuntime} disabled={!!busy || !job?.approvalHash} className="rounded-xl border border-[#c8c8c8]/20 px-3 py-2 text-xs font-black text-[#d9d9d9] disabled:opacity-40">ส่งเข้ารันไทม์</button><button onClick={launch} disabled={!!busy || !job?.approvalHash || job.status !== 'READY_FOR_RUNTIME'} className="rounded-xl border border-[#d6a63a]/35 bg-[#d6a63a]/10 px-3 py-2 text-xs font-black text-[#f5d27a] disabled:opacity-40">เริ่มสร้างแอป</button></div>{job?.prd?.summary ? <section className="rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3"><p className="text-xs font-black text-[#f2f2f2]">PRD summary</p><p className="mt-2 text-xs leading-5">{job.prd.summary}</p></section> : null}{job?.proposedPlan ? <section className="space-y-2 rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3"><p className="text-xs font-black text-[#f2f2f2]">Plan steps</p>{job.proposedPlan.steps.map((s) => <div key={s.id} className="rounded-lg border border-[#c8c8c8]/10 p-2"><p className="text-[11px] text-[#8d8d8d]">{s.id} · {s.phase} · {s.riskLevel}</p><p className="mt-1 text-xs font-bold text-[#d9d9d9]">{s.title}</p></div>)}</section> : null}{toolCall ? <section className="rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3 text-xs leading-5 text-[#f5d27a]"><p className="font-black">สร้างแอปเสร็จแล้ว</p><p>Audit written: {String(toolCall.evidence.auditWritten)}</p><p>{toolCall.evidence.note}</p></section> : null}{toolCall?.output ? <section className="rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3 text-xs leading-5 text-[#f5d27a]"><p className="font-black">ผลลัพธ์</p><p>Repo: {toolCall.output.repository}</p><p>Branch: {toolCall.output.branchName}</p><p>Files: {toolCall.output.generatedFiles.length}</p><a href={toolCall.output.pullRequestUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 underline">เปิด PR #{toolCall.output.pullRequestNumber}<ExternalLink className="h-3.5 w-3.5" /></a></section> : null}</aside>
    </div>
  </div>;
}
