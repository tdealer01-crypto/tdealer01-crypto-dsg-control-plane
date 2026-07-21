import { promises as fs } from 'fs';
import path from 'path';
import React from 'react';
import Link from 'next/link';
import Markdoc from '@markdoc/markdoc';
import { markdocConfig } from '../../../markdoc/config';
import { createMarkdocComponents } from '../../../markdoc/components';

const DOCS_DIR = path.join(process.cwd(), 'markdoc', 'docs');

export const dynamic = 'force-dynamic';

export default async function DocsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langParam } = await params;
  const lang = langParam || 'en';
  const filePath = path.join(DOCS_DIR, lang, 'index.md');

  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b]">
        <p className="text-slate-400">Document not found. Try <Link href="/docs/en" className="text-emerald-400">English</Link> or <Link href="/docs/th" className="text-emerald-400">ไทย</Link></p>
      </div>
    );
  }

  const transformed = Markdoc.transform(Markdoc.parse(content), markdocConfig);
  const rendered = Markdoc.renderers.react(transformed, React, {
    components: createMarkdocComponents(),
  });

  const availableLangs = [
    { code: 'en', label: '🇬🇧 English' },
    { code: 'th', label: '🇹🇭 ไทย' },
  ];

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-black">
                DSG
              </div>
              <span className="text-lg font-semibold text-white">Documentation</span>
            </Link>
          </div>
          {/* Language Switcher */}
          <div className="flex gap-2">
            {availableLangs.map((l) => (
              <Link
                key={l.code}
                href={`/docs/${l.code}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  lang === l.code
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <article className="docs-content">
          {rendered}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        DSG ONE Documentation · {lang === 'th' ? 'เอกสารภาษาไทย' : 'English Documentation'}
      </footer>
    </div>
  );
}
