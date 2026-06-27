'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type SkillEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  registry: string;
  platforms: string[];
  isBuiltIn?: boolean;
  isOptional?: boolean;
  installCmd?: string;
  tags?: string[];
};

type Registry = {
  id: string;
  name: string;
  count: number;
  description: string;
};

type SkillsData = {
  summary: {
    total: number;
    builtIn: number;
    optional: number;
    community: number;
    categories: number;
    registries: number;
    catalogRefreshed: string;
  };
  registries: Registry[];
  skills: SkillEntry[];
};

const PLATFORM_ICON: Record<string, string> = {
  linux: '🐧',
  macos: '',
  windows: '',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Apple': 'text-slate-300 border-slate-600 bg-slate-800/60',
  'AI Agents': 'text-violet-300 border-violet-500/30 bg-violet-500/10',
  'Creative': 'text-pink-300 border-pink-500/30 bg-pink-500/10',
  'Data Science': 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
  'DevOps': 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  'Gaming': 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  'GitHub': 'text-slate-300 border-slate-500/30 bg-slate-500/10',
  'MCP': 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  'Media': 'text-red-300 border-red-500/30 bg-red-500/10',
  'MLOps': 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  'Productivity': 'text-teal-300 border-teal-500/30 bg-teal-500/10',
  'Web': 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  'Messaging': 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
  'Finance': 'text-green-300 border-green-500/30 bg-green-500/10',
  'Database': 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'text-slate-400 border-slate-700 bg-slate-800/40';
}

function RegistryBadge({ registry }: { registry: string }) {
  const colors: Record<string, string> = {
    'built-in': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'optional': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'anthropic': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'openai': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${colors[registry] ?? 'bg-slate-800 text-slate-500 border-slate-700'}`}>
      {registry === 'built-in' ? '✓ Built-in' : registry === 'optional' ? '⚡ Optional' : registry}
    </span>
  );
}

function SkillCard({ skill, onInstall }: { skill: SkillEntry; onInstall?: (cmd: string) => void }) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-slate-900/60 p-4 transition hover:border-white/15 hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-slate-100">{skill.name}</p>
        <RegistryBadge registry={skill.registry} />
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-slate-400">{skill.description}</p>
      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skill.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500">{t}</span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${categoryColor(skill.category)}`}>
          {skill.category}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600">
            {skill.platforms.map((p) => PLATFORM_ICON[p] ?? p).join(' ')}
          </span>
          {skill.installCmd && onInstall && (
            <button
              type="button"
              onClick={() => onInstall(skill.installCmd!)}
              className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const REGISTRY_TABS = ['All', 'Built-in', 'Optional', 'Anthropic', 'OpenAI', 'HuggingFace', 'NVIDIA', 'skills.sh', 'ClawHub', 'browse.sh', 'LobeHub', 'Marketplace', 'gstack'];

export default function SkillsHubPage() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [search, setSearch] = useState('');
  const [activeRegistry, setActiveRegistry] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [_installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dsg/hermes/skills')
      .then((r) => r.json())
      .then((d: SkillsData) => setData(d))
      .catch(() => {});
  }, []);

  const handleInstall = useCallback(async (cmd: string) => {
    setInstallingId(cmd);
    try {
      await fetch('/api/dsg/hermes/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: cmd }),
      });
    } finally {
      setInstallingId(null);
    }
  }, []);

  const filtered = (data?.skills ?? []).filter((s) => {
    const matchesRegistry =
      activeRegistry === 'All' ||
      (activeRegistry === 'Built-in' && s.registry === 'built-in') ||
      (activeRegistry === 'Optional' && s.registry === 'optional') ||
      s.registry.toLowerCase() === activeRegistry.toLowerCase();
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q);
    return matchesRegistry && matchesCategory && matchesSearch;
  });

  const categories = ['All', ...Array.from(new Set((data?.skills ?? []).map((s) => s.category))).sort()];

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setSearch('');
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById('skill-search')?.focus();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-slate-950/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/hermes" className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-xs font-bold text-violet-300 transition hover:bg-violet-500/30">
                H
              </Link>
              <div>
                <p className="text-sm font-bold text-white">Skills Hub</p>
                <p className="text-xs text-slate-500">Hermes Agent · Discover, search, and install skills</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {summary && (
                <span>
                  Catalog refreshed{' '}
                  {new Date(summary.catalogRefreshed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' '}· auto-rebuilt twice daily
                </span>
              )}
              <Link href="/dashboard/hermes" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white">
                ← Back to Hermes
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* hero stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Skills Hub</h1>
          <p className="mt-1 text-sm text-slate-400">
            Discover, search, and install from{' '}
            {summary ? summary.total.toLocaleString() : '89,118'} skills across{' '}
            {summary?.registries ?? 12} registries
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: 'Built-in', count: summary?.builtIn ?? 90, color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
              { label: 'Optional', count: summary?.optional ?? 86, color: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
              { label: 'Community', count: summary?.community ?? 88942, color: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
              { label: 'Categories', count: summary?.categories ?? 175, color: 'text-slate-300 border-slate-600 bg-slate-800/60' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-lg border px-4 py-2 ${color}`}>
                <p className="text-lg font-bold">{count.toLocaleString()}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* search */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <input
              id="skill-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={'Search skills... (press "/" to focus)'}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 pr-10 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-400/40 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-600">/</span>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* sidebar — categories */}
          <aside className="hidden w-44 shrink-0 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Categories</p>
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition ${activeCategory === cat ? 'bg-violet-500/20 font-semibold text-violet-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* registry tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
              {REGISTRY_TABS.map((tab) => {
                const reg = data?.registries.find((r) => r.name === tab || (tab === 'All' && r.id === 'all'));
                const count = reg?.count;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveRegistry(tab)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${activeRegistry === tab ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                  >
                    {tab}
                    {count != null && <span className="ml-1 opacity-60">{count.toLocaleString()}</span>}
                  </button>
                );
              })}
            </div>

            {/* results count */}
            <p className="mb-4 text-xs text-slate-500">
              {filtered.length === 0
                ? 'No skills match your filter.'
                : `${filtered.length} skill${filtered.length !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`}
              {(activeRegistry !== 'All' || activeCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => { setActiveRegistry('All'); setActiveCategory('All'); setSearch(''); }}
                  className="ml-2 text-violet-400 hover:text-violet-200"
                >
                  Clear filters
                </button>
              )}
            </p>

            {/* skills grid */}
            {filtered.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onInstall={skill.installCmd ? handleInstall : undefined}
                  />
                ))}
              </div>
            ) : !data ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                Loading skills catalog...
              </div>
            ) : null}

            {/* community registry notice */}
            {(activeRegistry === 'All' || ['skills.sh', 'ClawHub', 'browse.sh', 'LobeHub', 'gstack'].includes(activeRegistry)) && (
              <div className="mt-8 rounded-xl border border-violet-400/20 bg-violet-500/5 p-5">
                <p className="text-sm font-semibold text-violet-300">Community Registries</p>
                <p className="mt-1 text-xs text-slate-400">
                  {(88942).toLocaleString()} community skills are available across skills.sh, ClawHub, browse.sh, LobeHub, and gstack.
                  Use the Hermes Agent to search and install community skills by name.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data?.registries.filter((r) => !['built-in', 'optional'].includes(r.id)).map((r) => (
                    <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                      <p className="text-xs font-semibold text-slate-200">{r.name}</p>
                      <p className="text-[10px] text-slate-500">{r.count.toLocaleString()} skills</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">Install via Hermes Agent chat:</p>
                  <code className="text-xs text-violet-300">{'install skill <name> from skills.sh'}</code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* platform features */}
        <section className="mt-12 border-t border-white/[0.06] pt-10">
          <h2 className="mb-6 text-lg font-bold text-white">Platform Features</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '💬', title: 'Lives Where You Do', body: 'Telegram, Discord, Slack, WhatsApp, Signal, Email, CLI — start on one platform, pick up on another.' },
              { icon: '🧠', title: 'Grows the Longer It Runs', body: 'Persistent memory and auto-generated skills — learns your projects and never forgets how it solved a problem.' },
              { icon: '⏰', title: 'Scheduled Automations', body: 'Natural language cron scheduling for reports, backups, and briefings — running unattended through the gateway.' },
              { icon: '🤖', title: 'Delegates & Parallelizes', body: 'Isolated subagents with their own conversations, terminals, and Python RPC scripts for zero-context-cost pipelines.' },
              { icon: '🔒', title: 'Real Sandboxing', body: 'Five backends — local, Docker, SSH, Singularity, Modal — with container hardening and namespace isolation.' },
              { icon: '🌐', title: 'Full Web & Browser Control', body: 'Web search, browser automation, vision, image generation, text-to-speech, and multi-model reasoning.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.07] bg-slate-900/60 p-5">
                <div className="mb-2 text-2xl">{icon}</div>
                <p className="font-semibold text-slate-100">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Tools', value: '40+', detail: 'web search, terminal, file system, browser automation, vision, image generation, code execution' },
              { label: 'Platforms', value: '7+', detail: 'Telegram, Discord, Slack, WhatsApp, Signal, Email, CLI' },
              { label: 'Environments', value: '5', detail: 'Local, Docker, SSH, Modal, Singularity' },
              { label: 'Skills', value: '89K+', detail: 'Built-in + community via agentskills.io open format' },
            ].map(({ label, value, detail }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-slate-900/60 p-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs font-semibold text-slate-300">{label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* footer */}
        <footer className="mt-12 border-t border-white/[0.06] pt-6 flex items-center justify-between text-xs text-slate-600">
          <span>Built by Nous Research · MIT License · 2026</span>
          <div className="flex gap-4">
            <Link href="/docs" className="hover:text-slate-400">Docs</Link>
            <Link href="/dashboard/hermes" className="hover:text-slate-400">Hermes Agent</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
