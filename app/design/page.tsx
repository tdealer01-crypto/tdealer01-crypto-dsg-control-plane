import { promises as fs } from 'fs';
import path from 'path';
import React from 'react';
import Link from 'next/link';
import Markdoc from '@markdoc/markdoc';
import { markdocConfig } from '../../markdoc/config';

const DESIGN_PATH = path.join(process.cwd(), 'DESIGN.md');

export const dynamic = 'force-dynamic';

function createComponents() {
  return {
    // Design-system-specific tags (already implemented as stubs).
    DesignButton: ({ color, variant, children }: any) => null,
    ColorSwatch: ({ color, name, usage }: any) => null,
    SpacingTable: () => null,
    ComponentSpec: ({ name, bg, border, rounded, padding, text }: any) => null,

    // Base markdown nodes. markdocConfig.nodes maps every standard markdown
    // construct (heading, paragraph, list, table, link, ...) to one of these
    // component names via `render: 'X'`. Without an entry here, Markdoc's
    // react renderer looks up an undefined component and React throws
    // "Element type is invalid ... but got: undefined" on any normal
    // markdown content (the actual cause of the /design crash).
    Document: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Heading: ({ id, level, children }: any) =>
      React.createElement(`h${level ?? 2}`, { id }, children),
    Paragraph: ({ children }: any) => React.createElement('p', null, children),
    BlockQuote: ({ children }: any) => React.createElement('blockquote', null, children),
    CodeBlock: ({ content, language }: any) =>
      React.createElement('pre', null, React.createElement('code', { className: language ? `language-${language}` : undefined }, content)),
    HR: () => React.createElement('hr'),
    List: ({ ordered, children }: any) => React.createElement(ordered ? 'ol' : 'ul', null, children),
    ListItem: ({ children }: any) => React.createElement('li', null, children),
    Table: ({ children }: any) => React.createElement('table', null, children),
    THead: ({ children }: any) => React.createElement('thead', null, children),
    TBody: ({ children }: any) => React.createElement('tbody', null, children),
    TR: ({ children }: any) => React.createElement('tr', null, children),
    TH: ({ align, children }: any) => React.createElement('th', { style: align ? { textAlign: align } : undefined }, children),
    TD: ({ align, children }: any) => React.createElement('td', { style: align ? { textAlign: align } : undefined }, children),
    Link: ({ href, children }: any) => React.createElement('a', { href, target: href?.startsWith('http') ? '_blank' : undefined, rel: href?.startsWith('http') ? 'noopener noreferrer' : undefined }, children),
    Image: ({ src, alt }: any) => React.createElement('img', { src, alt }),
    Strong: ({ children }: any) => React.createElement('strong', null, children),
    Em: ({ children }: any) => React.createElement('em', null, children),
  };
}

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
    components: createComponents(),
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
