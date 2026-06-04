/**
 * GET /api/dsg/hermes/skills
 *
 * Skills registry index for the Hermes Agent Skills Hub.
 * Returns built-in skills, optional skills, and community registry metadata.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type SkillEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  registry: string;
  platforms: string[];
  tags?: string[];
  isBuiltIn?: boolean;
  isOptional?: boolean;
  author?: string;
};

export type SkillRegistry = {
  id: string;
  name: string;
  count: number;
  description: string;
};

const BUILT_IN_SKILLS: SkillEntry[] = [
  // Apple
  { id: 'apple-notes', name: 'apple-notes', description: 'Manage Apple Notes via memo CLI: create, search, edit.', category: 'Apple', registry: 'built-in', platforms: ['macos'], isBuiltIn: true },
  { id: 'apple-reminders', name: 'apple-reminders', description: 'Apple Reminders via remindctl: add, list, complete.', category: 'Apple', registry: 'built-in', platforms: ['macos'], isBuiltIn: true },
  { id: 'findmy', name: 'findmy', description: 'Track Apple devices/AirTags via FindMy.app on macOS.', category: 'Apple', registry: 'built-in', platforms: ['macos'], isBuiltIn: true },
  { id: 'imessage', name: 'imessage', description: 'Send and receive iMessages/SMS via the imsg CLI on macOS.', category: 'Apple', registry: 'built-in', platforms: ['macos'], isBuiltIn: true },
  { id: 'macos-computer-use', name: 'macos-computer-use', description: 'Drive the macOS desktop in the background — screenshots, mouse, keyboard, scroll, drag.', category: 'Apple', registry: 'built-in', platforms: ['macos'], isBuiltIn: true },
  // AI Agents
  { id: 'claude-code', name: 'claude-code', description: 'Delegate coding to Claude Code CLI (features, PRs).', category: 'AI Agents', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'codex', name: 'codex', description: 'Delegate coding to OpenAI Codex CLI (features, PRs).', category: 'AI Agents', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'hermes-agent', name: 'hermes-agent', description: 'Configure, extend, or contribute to Hermes Agent.', category: 'AI Agents', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'kanban-codex-lane', name: 'kanban-codex-lane', description: 'Use when a Hermes Kanban worker wants to run Codex CLI as an isolated implementation lane.', category: 'AI Agents', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'opencode', name: 'opencode', description: 'Delegate coding to OpenCode CLI (features, PR review).', category: 'AI Agents', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // Creative
  { id: 'architecture-diagram', name: 'architecture-diagram', description: 'Dark-themed SVG architecture/cloud/infra diagrams as HTML.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'ascii-art', name: 'ascii-art', description: 'ASCII art: pyfiglet, cowsay, boxes, image-to-ascii.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'ascii-video', name: 'ascii-video', description: 'ASCII video: convert video/audio to colored ASCII MP4/GIF.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'baoyu-article-illustrator', name: 'baoyu-article-illustrator', description: 'Article illustrations: type × style × palette consistency.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'baoyu-comic', name: 'baoyu-comic', description: 'Knowledge comics (知识漫画): educational, biography, tutorial.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'baoyu-infographic', name: 'baoyu-infographic', description: 'Infographics: 21 layouts x 21 styles (信息图, 可视化).', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'claude-design', name: 'claude-design', description: 'Design one-off HTML artifacts (landing, deck, prototype).', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'comfyui', name: 'comfyui', description: 'Generate images, video, and audio with ComfyUI — install, launch, manage nodes/models, run workflows.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'design-md', name: 'design-md', description: "Author/validate/export Google's DESIGN.md token spec files.", category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'excalidraw', name: 'excalidraw', description: 'Hand-drawn Excalidraw JSON diagrams (arch, flow, seq).', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'humanizer', name: 'humanizer', description: 'Humanize text: strip AI-isms and add real voice.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'ideation', name: 'ideation', description: 'Generate project ideas via creative constraints.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'manim-video', name: 'manim-video', description: 'Manim CE animations: 3Blue1Brown math/algo videos.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'p5js', name: 'p5js', description: 'p5.js sketches: gen art, shaders, interactive, 3D.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'pixel-art', name: 'pixel-art', description: 'Pixel art w/ era palettes (NES, Game Boy, PICO-8).', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'popular-web-designs', name: 'popular-web-designs', description: '54 real design systems (Stripe, Linear, Vercel) as HTML/CSS.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'pretext', name: 'pretext', description: 'Browser demos with @chenglou/pretext — DOM-free text layout, ASCII art, typographic flow.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'sketch', name: 'sketch', description: 'Throwaway HTML mockups: 2-3 design variants to compare.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'songwriting-and-ai-music', name: 'songwriting-and-ai-music', description: 'Songwriting craft and Suno AI music prompts.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'touchdesigner-mcp', name: 'touchdesigner-mcp', description: 'Control a running TouchDesigner instance via twozero MCP — 36 native tools.', category: 'Creative', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // Data Science
  { id: 'jupyter-live-kernel', name: 'jupyter-live-kernel', description: 'Iterative Python via live Jupyter kernel (hamelnb).', category: 'Data Science', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // DevOps
  { id: 'kanban-orchestrator', name: 'kanban-orchestrator', description: 'Decomposition playbook + anti-temptation rules for an orchestrator profile routing work through Kanban.', category: 'DevOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'kanban-worker', name: 'kanban-worker', description: 'Pitfalls, examples, and edge cases for Hermes Kanban workers.', category: 'DevOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'webhook-subscriptions', name: 'webhook-subscriptions', description: 'Webhook subscriptions: event-driven agent runs.', category: 'DevOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // Gaming
  { id: 'minecraft-modpack-server', name: 'minecraft-modpack-server', description: 'Host modded Minecraft servers (CurseForge, Modrinth).', category: 'Gaming', registry: 'built-in', platforms: ['linux', 'macos'], isBuiltIn: true },
  { id: 'pokemon-player', name: 'pokemon-player', description: 'Play Pokemon via headless emulator + RAM reads.', category: 'Gaming', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // GitHub
  { id: 'codebase-inspection', name: 'codebase-inspection', description: 'Inspect codebases w/ pygount: LOC, languages, ratios.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'github-auth', name: 'github-auth', description: 'GitHub auth setup: HTTPS tokens, SSH keys, gh CLI login.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'github-code-review', name: 'github-code-review', description: 'Review PRs: diffs, inline comments via gh or REST.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'github-issues', name: 'github-issues', description: 'Create, triage, label, assign GitHub issues via gh or REST.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'github-pr-workflow', name: 'github-pr-workflow', description: 'GitHub PR lifecycle: branch, commit, open, CI, merge.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'github-repo-management', name: 'github-repo-management', description: 'Clone/create/fork repos; manage remotes, releases.', category: 'GitHub', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // MCP
  { id: 'native-mcp', name: 'native-mcp', description: 'MCP client: connect servers, register tools (stdio/HTTP).', category: 'MCP', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // Media
  { id: 'gif-search', name: 'gif-search', description: 'Search/download GIFs from Tenor via curl + jq.', category: 'Media', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'heartmula', name: 'heartmula', description: 'HeartMuLa: Suno-like song generation from lyrics + tags.', category: 'Media', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'songsee', name: 'songsee', description: 'Audio spectrograms/features (mel, chroma, MFCC) via CLI.', category: 'Media', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'spotify', name: 'spotify', description: 'Spotify: play, search, queue, manage playlists and devices.', category: 'Media', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'youtube-content', name: 'youtube-content', description: 'YouTube transcripts to summaries, threads, blogs.', category: 'Media', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // MLOps
  { id: 'audiocraft-audio-generation', name: 'audiocraft-audio-generation', description: 'AudioCraft: MusicGen text-to-music, AudioGen text-to-sound.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos'], isBuiltIn: true },
  { id: 'dspy', name: 'dspy', description: 'DSPy: declarative LM programs, auto-optimize prompts, RAG.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'evaluating-llms-harness', name: 'evaluating-llms-harness', description: 'lm-eval-harness: benchmark LLMs (MMLU, GSM8K, etc.).', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos'], isBuiltIn: true },
  { id: 'huggingface-hub', name: 'huggingface-hub', description: 'HuggingFace hf CLI: search/download/upload models, datasets.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'llama-cpp', name: 'llama-cpp', description: 'llama.cpp local GGUF inference + HF Hub model discovery.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'obliteratus', name: 'obliteratus', description: 'OBLITERATUS: abliterate LLM refusals (diff-in-means).', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos'], isBuiltIn: true },
  { id: 'segment-anything-model', name: 'segment-anything-model', description: 'SAM: zero-shot image segmentation via points, boxes, masks.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'serving-llms-vllm', name: 'serving-llms-vllm', description: 'vLLM: high-throughput LLM serving, OpenAI API, quantization.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos'], isBuiltIn: true },
  { id: 'weights-and-biases', name: 'weights-and-biases', description: 'W&B: log ML experiments, sweeps, model registry, dashboards.', category: 'MLOps', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  // Productivity
  { id: 'airtable', name: 'airtable', description: 'Airtable REST API via curl. Records CRUD, filters, upserts.', category: 'Productivity', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'google-workspace', name: 'google-workspace', description: 'Gmail, Calendar, Drive, Docs, Sheets via gws CLI or Python.', category: 'Productivity', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
  { id: 'linear', name: 'linear', description: 'Linear: manage issues, projects, teams via GraphQL + curl.', category: 'Productivity', registry: 'built-in', platforms: ['linux', 'macos', 'windows'], isBuiltIn: true },
];

const OPTIONAL_SKILLS: SkillEntry[] = [
  { id: 'browserbase', name: 'browserbase', description: 'Browserbase cloud browser — full JS rendering, screenshot, extract.', category: 'Web', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'telegram-bot', name: 'telegram-bot', description: 'Telegram bot: send messages, receive commands, manage groups.', category: 'Messaging', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'stripe-payments', name: 'stripe-payments', description: 'Stripe: create payment intents, subscriptions, webhooks.', category: 'Finance', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'supabase-admin', name: 'supabase-admin', description: 'Supabase admin: manage tables, RLS, migrations, edge functions.', category: 'Database', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'vercel-deploy', name: 'vercel-deploy', description: 'Vercel CLI: deploy, manage env vars, domains, and preview URLs.', category: 'DevOps', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'docker-compose', name: 'docker-compose', description: 'Docker Compose: manage multi-container apps, networks, volumes.', category: 'DevOps', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'slack-notify', name: 'slack-notify', description: 'Slack: send messages, create channels, post to webhooks.', category: 'Messaging', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
  { id: 'notion-workspace', name: 'notion-workspace', description: 'Notion: read/write pages, databases, blocks via REST API.', category: 'Productivity', registry: 'optional', platforms: ['linux', 'macos', 'windows'], isOptional: true },
];

const REGISTRIES: SkillRegistry[] = [
  { id: 'built-in', name: 'Built-in', count: 90, description: 'Bundled with Hermes Agent' },
  { id: 'optional', name: 'Optional', count: 86, description: 'Official extensions' },
  { id: 'anthropic', name: 'Anthropic', count: 17, description: 'Anthropic official skills' },
  { id: 'openai', name: 'OpenAI', count: 44, description: 'OpenAI official skills' },
  { id: 'huggingface', name: 'HuggingFace', count: 15, description: 'HuggingFace community' },
  { id: 'nvidia', name: 'NVIDIA', count: 132, description: 'NVIDIA AI skills' },
  { id: 'skills.sh', name: 'skills.sh', count: 19951, description: 'skills.sh community registry' },
  { id: 'clawhub', name: 'ClawHub', count: 67851, description: 'ClawHub community registry' },
  { id: 'browse.sh', name: 'browse.sh', count: 374, description: 'Web browsing skills' },
  { id: 'lobehub', name: 'LobeHub', count: 505, description: 'LobeHub AI skills' },
  { id: 'marketplace', name: 'Marketplace', count: 1, description: 'DSG ONE Marketplace' },
  { id: 'gstack', name: 'gstack', count: 52, description: 'gstack community' },
];

export async function GET() {
  const totalCommunity = REGISTRIES.filter(
    (r) => !['built-in', 'optional'].includes(r.id),
  ).reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({
    ok: true,
    summary: {
      total: REGISTRIES.reduce((sum, r) => sum + r.count, 0),
      builtIn: REGISTRIES.find((r) => r.id === 'built-in')?.count ?? 90,
      optional: REGISTRIES.find((r) => r.id === 'optional')?.count ?? 86,
      community: totalCommunity,
      categories: 175,
      registries: REGISTRIES.length,
      catalogRefreshed: new Date().toISOString(),
    },
    registries: REGISTRIES,
    skills: [
      ...BUILT_IN_SKILLS,
      ...OPTIONAL_SKILLS,
    ],
  });
}
