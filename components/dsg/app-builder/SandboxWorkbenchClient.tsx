'use client';

import { useState } from 'react';

type SandboxResult = {
  ok?: boolean;
  error?: { code: string; message: string };
  jobId?: string;
  goal?: string;
  branchName?: string;
  claimStatus?: string;
  planHash?: string;
  resultHash?: string;
  prNumber?: number;
  prUrl?: string;
  repoFullName?: string;
  fileWrites?: Array<{ path: string; mode?: string; gate?: string; bytes?: number }>;
  paths?: string[];
  commands?: Array<{ command: string; gate: string; execution: string }>;
  nextActions?: string[];
  productionReadyClaim?: false;
};

const dsgHeaders = {
  'content-type': 'application/json',
  'x-dsg-workspace-id': 'demo-workspace',
  'x-dsg-actor-id': 'operator-ui',
  'x-dsg-actor-role': 'operator',
  'x-dsg-permissions': 'memory:read,memory:write',
};

const examples = [
  'สร้างเกม ABC เด็ก 3 ขวบ มีปุ่มใหญ่ พรีวิวข้างๆ และบันทึกคะแนนลงฐานข้อมูล',
  'สร้างระบบจองคิวร้านเล็ก ลูกค้าเลือกเวลา เจ้าของร้านเห็นรายการจอง',
  'สร้าง CRM ทีมเล็ก มีรายชื่อลูกค้า โน้ต งานติดตาม และสถานะดีล',
];

function tone(ok?: boolean) {
  if (ok === true) return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  if (ok === false) return 'border-rose-400/40 bg-rose-500/10 text-rose-100';
  return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
}

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'generated-app';
}

export function SandboxWorkbenchClient() {
  const [goal, setGoal] = useState(examples[0]);
  const [jobId, setJobId] = useState('ui-sandbox-demo');
  const [commands, setCommands] = useState('npm run dsg:typecheck\nnpm run build:termux');
  const [plan, setPlan] = useState<SandboxResult | null>(null);
  const [prResult, setPrResult] = useState<SandboxResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready. Create a sandbox plan before any file write or PR action.');

  async function runSandboxPlan() {
    setBusy(true);
    setStatus('Evaluating sandbox path, command, secret, truth, and user-benefit gates…');
    try {
      const response = await fetch('/api/dsg/app-builder/sandbox/plan', {
        method: 'POST',
        headers: dsgHeaders,
        body: JSON.stringify({ jobId, goal, commands: commands.split('\n').map((line) => line.trim()).filter(Boolean) }),
      });
      const json = (await response.json()) as SandboxResult;
      if (!response.ok || json.error) throw new Error(json.error?.message || 'SANDBOX_PLAN_FAILED');
      setPlan(json);
      setPrResult(null);
      setStatus(`${json.claimStatus || 'SANDBOX_PLAN_READY'} · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SANDBOX_PLAN_FAILED');
    } finally {
      setBusy(false);
    }
  }

  async function runPrExecutor(dryRun: boolean) {
    setBusy(true);
    setStatus(dryRun ? 'Running gated PR dry-run…' : 'Creating gated draft PR…');
    try {
      const response = await fetch('/api/dsg/app-builder/sandbox/pr-executor', {
        method: 'POST',
        headers: dsgHeaders,
        body: JSON.stringify({ jobId, appId: safeId(jobId), goal, dryRun }),
      });
      const json = (await response.json()) as SandboxResult;
      if (!response.ok || json.error) throw new Error(json.error?.message || 'PR_EXECUTOR_FAILED');
      setPrResult(json);
      setStatus(`${json.claimStatus || (dryRun ? 'PR_EXECUTOR_DRY_RUN_READY' : 'IMPLEMENTED_UNVERIFIED')} · productionReadyClaim=false`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'PR_EXECUTOR_FAILED');
    } finally {
      setBusy(false);
    }
  }

  const visible = prResult || plan;
  const files = visible?.fileWrites?.length ? visible.fileWrites : (visible?.paths || []).map((path) => ({ path }));
  const resultOk = prResult?.ok ?? plan?.ok;

  return (
    <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-300">Sandbox Workbench</p>
        <h2 className="mt-2 text-3xl font-black text-white">ตรวจแผนเขียนไฟล์ก่อนให้ agent ทำงาน</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          ผู้ใช้ต้องเห็น branch, file paths, commands, gate result, dry-run และ draft PR ก่อนทุกครั้ง. Draft PR ยังไม่ merge และยังไม่ใช่ production-ready claim.
        </p>

        <div className="mt-5 grid gap-3">
          {examples.map((example) => (
            <button key={example} onClick={() => setGoal(example)} className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left text-sm text-slate-300 hover:border-indigo-400/50">
              {example}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Job ID / App ID</label>
        <input value={jobId} onChange={(event) => setJobId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />

        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Goal</label>
        <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-indigo-500" />

        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Allowed commands requested</label>
        <textarea value={commands} onChange={(event) => setCommands(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-white outline-none focus:border-indigo-500" />

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
          <button onClick={() => void runSandboxPlan()} disabled={busy} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Working…' : 'Create sandbox plan'}
          </button>
          <button onClick={() => void runPrExecutor(true)} disabled={busy} className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-5 py-3 text-sm font-black text-indigo-100 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            PR dry-run
          </button>
          <button onClick={() => void runPrExecutor(false)} disabled={busy} className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            Create draft PR
          </button>
        </div>

        <p className={`mt-4 rounded-2xl border p-3 text-xs font-mono ${tone(resultOk)}`}>{status}</p>
        <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
          Create draft PR requires Vercel env GITHUB_TOKEN. It creates a branch and draft PR only; it does not merge or claim production-ready.
        </p>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">Sandbox / PR result</p>
          <h2 className="mt-1 text-2xl font-black text-white">branch / files / commands / PR</h2>
          {visible ? (
            <div className="mt-5 space-y-4">
              <div className={`rounded-2xl border p-4 ${tone(resultOk)}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">{visible.claimStatus}</p>
                <p className="mt-2 break-all text-xs">hash: {visible.resultHash || visible.planHash}</p>
                <p className="mt-1 break-all text-xs">branch: {visible.branchName}</p>
                {visible.prUrl ? <a href={visible.prUrl} className="mt-3 inline-flex rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">Open PR #{visible.prNumber}</a> : null}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">File writes</p>
                <div className="mt-3 space-y-2">
                  {files.map((file) => (
                    <div key={file.path} className="rounded-xl bg-slate-900 p-3 text-xs text-slate-300">
                      <p className="break-all font-mono">{file.path}</p>
                      <p className="mt-1 text-slate-500">{file.bytes ? `${file.bytes} bytes` : `${file.mode || 'write'} · ${file.gate || 'planned'}`}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Commands</p>
                <div className="mt-3 space-y-2">
                  {(visible.commands || []).map((command) => (
                    <div key={command.command} className="rounded-xl bg-slate-900 p-3 text-xs text-slate-300">
                      <p className="font-mono">{command.command}</p>
                      <p className="mt-1 text-slate-500">{command.gate} · {command.execution}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Next actions</p>
                <div className="mt-3 space-y-2">
                  {(visible.nextActions || []).map((action) => <p key={action} className="rounded-xl bg-slate-900 p-2 text-xs text-slate-300">{action}</p>)}
                  {visible.prUrl ? <p className="rounded-xl bg-slate-900 p-2 text-xs text-slate-300">Open draft PR, run checks, review diff, then merge only after evidence passes.</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              ยังไม่มีผล. กด Create sandbox plan หรือ PR dry-run ก่อน.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
