'use client';

import { AppPreviewPanel } from './app-preview-panel';
import { GuidedAppBuilderView } from './guided-app-builder-view';

export function EnterpriseBuildWorkspace() {
  return (
    <div className="space-y-3 bg-[#F6F0E1] p-3 text-[#101114]">
      <div className="rounded-2xl border border-[#C8A24D] bg-[#071326] p-3 text-[#F5F7FA]">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Enterprise App Builder</p>
        <h1 className="text-xl font-black">Build App Workspace</h1>
        <p className="text-sm text-[#D7D9DE]">Governed planning, approval controls, pull request evidence, and application preview in one customer workspace.</p>
      </div>
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <GuidedAppBuilderView />
        <AppPreviewPanel />
      </div>
    </div>
  );
}
