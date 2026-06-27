/**
 * GET /llms-full.txt
 *
 * Full documentation concatenated into a single markdown file for one-shot ingestion.
 * ~1.8 MB. Also resolves at /docs/llms-full.txt via next.config.js redirect.
 *
 * Reads docs/ markdown files at request time. Generated fresh on every deploy.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

function readMarkdownFiles(dir: string, prefix = ''): Array<{ rel: string; content: string }> {
  const results: Array<{ rel: string; content: string }> = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries.sort()) {
    const full = path.join(dir, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (stat.isDirectory()) {
      results.push(...readMarkdownFiles(full, rel));
    } else if (entry.endsWith('.md')) {
      try {
        const content = fs.readFileSync(full, 'utf-8');
        results.push({ rel, content });
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

export async function GET() {
  const docsDir = path.join(process.cwd(), 'docs');
  const files = readMarkdownFiles(docsDir);

  const header = `# DSG ONE — AI Runtime Control Plane / ProofGate
# Full Documentation — Machine-Readable Concatenation
# Source: ${BASE}/llms-full.txt
# Curated index: ${BASE}/llms.txt
# Generated: ${new Date().toISOString()}
# Files: ${files.length} markdown documents from docs/
# ─────────────────────────────────────────────────────────────────────────────

`;

  const body = files
    .map(
      ({ rel, content }) =>
        `${'─'.repeat(80)}\n## FILE: docs/${rel}\n${'─'.repeat(80)}\n\n${content}\n`,
    )
    .join('\n');

  const coreFiles = [
    { path: 'CLAUDE.md', label: 'CLAUDE.md — AI Assistant Operating Guide' },
    { path: 'AGENTS.md', label: 'AGENTS.md — Permanent Agent Memory' },
    { path: 'PROJECT_TRUTH.md', label: 'PROJECT_TRUTH.md — Project Control Truth' },
    { path: 'README.md', label: 'README.md — Repository Overview' },
  ];

  let rootDocs = '';
  for (const { path: filePath, label } of coreFiles) {
    const full = path.join(process.cwd(), filePath);
    try {
      const content = fs.readFileSync(full, 'utf-8');
      rootDocs += `${'─'.repeat(80)}\n## FILE: ${label}\n${'─'.repeat(80)}\n\n${content}\n\n`;
    } catch {
      // skip missing root files
    }
  }

  const full = header + rootDocs + body;

  return new NextResponse(full, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
