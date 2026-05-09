import { NextResponse } from 'next/server';
import { runOpenAIAdapter, type OpenAIChatMessage } from '@/lib/dsg/ai/openai-adapter';

type DesignDraft = {
  goal: string;
  successCriteria: string[];
  constraints: string[];
  userFacingSummary: string;
  targetStack: {
    frontend: 'nextjs';
    backend: 'next-api';
    database: 'supabase-postgres';
    auth: 'none';
    deploy: 'vercel';
  };
  reviewStatus: 'DESIGN_DRAFT_READY' | 'NEEDS_MORE_DETAIL';
  truthBoundary: string;
};

function compact(value: string, max = 1200) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeHistory(history: unknown): OpenAIChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .map((item): OpenAIChatMessage | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const role = record.role === 'assistant' ? 'assistant' : record.role === 'user' ? 'user' : null;
      const content = typeof record.content === 'string' ? compact(record.content, 3000) : '';
      return role && content ? { role, content } : null;
    })
    .filter((item): item is OpenAIChatMessage => Boolean(item))
    .slice(-20);
}

function extractJsonObject(value: string) {
  const fenced = value.trim().match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value.trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('DESIGN_DRAFT_JSON_NOT_FOUND');
  return JSON.parse(source.slice(start, end + 1)) as Record<string, unknown>;
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === 'string').map((item) => compact(item, 180)).filter(Boolean).slice(0, 10);
  return items.length ? items : fallback;
}

function fallbackDraft(message: string): DesignDraft {
  const virtualPc = /virtual pc|pc เสมือน|คอมเสมือน|windows|วินโด้|remote mouse|รีโมตเมาส์|เมาส์|จอ|monitor/i.test(message);
  return {
    goal: compact(message || 'Create a governed DSG app', 900),
    successCriteria: virtualPc
      ? [
          'Virtual PC monitor surface is visible in the app',
          'Remote mouse API contract exists for external agents',
          'DSG invariant gate evaluates every remote mouse action before execution',
          'Every governed action returns request hash, audit hash, decision, and evidence output',
          'GitHub PR/branch evidence is returned before any production claim',
        ]
      : ['The app UI maps the user goal', 'The backend API returns real responses', 'The build returns PR/branch/evidence output'],
    constraints: [
      'Do not claim production verified without CI, migration, deployment, and production-flow proof',
      'Do not use mock data as production evidence',
      'External login, install, privileged settings, publish, payment, or destructive actions require approval/takeover',
    ],
    userFacingSummary: virtualPc
      ? 'Build a governed Virtual PC Agent Console with monitor surface, remote mouse API, invariant gate, and audit evidence.'
      : compact(message || 'Build a governed DSG app from the discussed requirement.', 260),
    targetStack: { frontend: 'nextjs', backend: 'next-api', database: 'supabase-postgres', auth: 'none', deploy: 'vercel' },
    reviewStatus: 'DESIGN_DRAFT_READY',
    truthBoundary: 'This is an AI design draft for Build Now. It is not implementation, PR evidence, deployment proof, or production verification.',
  };
}

function validateDraft(input: Record<string, unknown>, fallback: DesignDraft): DesignDraft {
  return {
    goal: typeof input.goal === 'string' ? compact(input.goal, 900) : fallback.goal,
    successCriteria: stringArray(input.successCriteria, fallback.successCriteria),
    constraints: stringArray(input.constraints, fallback.constraints),
    userFacingSummary: typeof input.userFacingSummary === 'string' ? compact(input.userFacingSummary, 300) : fallback.userFacingSummary,
    targetStack: fallback.targetStack,
    reviewStatus: input.reviewStatus === 'NEEDS_MORE_DETAIL' ? 'NEEDS_MORE_DETAIL' : 'DESIGN_DRAFT_READY',
    truthBoundary: typeof input.truthBoundary === 'string' ? compact(input.truthBoundary, 260) : fallback.truthBoundary,
  };
}

async function buildDraft(message: string, history: OpenAIChatMessage[]) {
  const fallback = fallbackDraft(`${history.map((item) => item.content).join(' ')} ${message}`);
  try {
    const result = await runOpenAIAdapter({
      temperature: 0.15,
      maxOutputTokens: 1000,
      messages: [
        {
          role: 'developer',
          content: [
            'You are the DSG App Builder design drafter before Build Now.',
            'Use the full conversation to produce the exact app the user wants.',
            'Return JSON only. No markdown. No prose.',
            'Do not ask the user to repeat requirements already in history.',
            'Do not claim implementation, deployment, or production proof.',
            'Schema: { goal:string, successCriteria:string[], constraints:string[], userFacingSummary:string, reviewStatus:"DESIGN_DRAFT_READY"|"NEEDS_MORE_DETAIL", truthBoundary:string }',
          ].join('\n'),
        },
        ...history,
        { role: 'user', content: JSON.stringify({ currentMessage: message, task: 'Create builder-ready design draft before Build Now.' }) },
      ],
    });
    return validateDraft(extractJsonObject(result.outputText), fallback);
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { message?: string; history?: unknown } | null;
    const history = normalizeHistory(body?.history);
    const message = compact(body?.message || history.at(-1)?.content || '', 2000);
    if (!message && !history.length) throw new Error('DESIGN_DRAFT_INPUT_REQUIRED');
    const draft = await buildDraft(message, history);
    return NextResponse.json({ ok: true, data: { draft } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DESIGN_DRAFT_FAILED';
    return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 400 });
  }
}
