import { promises as fs } from 'fs';
import path from 'path';
import React from 'react';
import Link from 'next/link';
import Markdoc from '@markdoc/markdoc';
import { markdocConfig } from '../../markdoc/config';
import { createMarkdocComponents } from '../../markdoc/components';

const DESIGN_PATH = path.join(process.cwd(), 'DESIGN.md');

export const dynamic = 'force-dynamic';

export default async function DesignPage() {
  let content: string;
  try {
    content = await fs.readFile(DESIGN_PATH, 'utf8');
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b]">
        <p className="text-slate-400">DESIGN.md not found</p>
      </div>
    );
  }

  const transformed = Markdoc.transform(Markdoc.parse(content), markdocConfig);
  const rendered = Markdoc.renderers.react(transformed, React, {
    components: createMarkdocComponents(),
  });

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-black">
              DSG
            </div>
            <span className="text-lg font-semibold text-white">Design System</span>
          </div>
          <div className="flex gap-2">
            <Link href="/docs/th" className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">เอกสาร</Link>
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <article className="design-content prose prose-invert max-w-none">
          {rendered}
        </article>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        DSG ONE Design System — Source of Truth
      </footer>
    </div>
  );
}
