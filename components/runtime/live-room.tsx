'use client';

import { CHANNEL_BADGES } from '../../lib/runtime/channel-contract';
import type { RuntimeSummaryCard, StreamConsoleMessage } from '../../lib/runtime/dashboard-contract';
import { StreamConsole } from './stream-console';

type LiveRoomProps = {
  summary: (RuntimeSummaryCard & { memory_recent?: any[] }) | null;
  streamItems: StreamConsoleMessage[];
};

export function LiveRoom({ summary, streamItems }: LiveRoomProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">Live Runtime Feed</p>
            <h2 className="mt-2 text-xl font-semibold">Spine Stream Room</h2>
          </div>

          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">live</div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CHANNEL_BADGES.map((item) => (
            <div key={item.channel} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${item.color_class}`}
              >
                {item.label}
              </div>
              <div className="mt-2 text-sm text-neutral-300">{item.description}</div>
            </div>
          ))}
        </div>

        <StreamConsole items={streamItems} />
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <h3 className="mb-4 text-lg font-medium">Spine Truth Snapshot</h3>
          <div className="grid gap-3">
            <div className="rounded-2xl bg-black/25 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Epoch</div>
              <div className="mt-2 text-2xl font-semibold text-cyan-300">{summary?.truth_state?.epoch ?? '-'}</div>
            </div>

            <div className="rounded-2xl bg-black/25 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Sequence</div>
              <div className="mt-2 text-2xl font-semibold text-white">{summary?.truth_state?.sequence ?? '-'}</div>
            </div>

            <div className="rounded-2xl bg-black/25 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Open Approvals</div>
              <div className="mt-2 text-2xl font-semibold text-amber-300">{summary?.approvals?.open ?? 0}</div>
            </div>

            <div className="rounded-2xl bg-black/25 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Committed Effects</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-300">{summary?.effects?.committed ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <h3 className="mb-4 text-lg font-medium">Recent Memory Writes</h3>
          <div className="space-y-3">
            {(summary?.memory_recent || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-neutral-500">No memory writes surfaced yet.</div>
            ) : (
              (summary?.memory_recent || []).map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{item.memory_key}</div>
                    <div className="text-xs text-neutral-500">{new Date(item.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-neutral-400">{item.lineage_hash}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <h3 className="mb-4 text-lg font-medium">Live Room Notes</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li>• ทุก channel ต้องวิ่งเข้า Spine ก่อนเสมอ</li>
            <li>• Tool / MCP result ต้องกลับเข้า Spine ก่อน commit truth</li>
            <li>• Dashboard อ่านจาก Spine truth เดียว</li>
            <li>• Agent คิดได้อิสระ แต่เปลี่ยนความจริงเองไม่ได้</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
