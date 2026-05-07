import { NextResponse } from 'next/server';
import { executeGovernedToolRequest, prepareGovernedToolRequest, type DsgGovernedToolRequest } from '@/lib/dsg/tools/governed-tools';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

export async function POST(req: Request) {
  const body = asRecord(await req.json().catch(() => null));
  const input: DsgGovernedToolRequest = {
    tool: String(body.tool || '').trim() as DsgGovernedToolRequest['tool'],
    action: String(body.action || '').trim() as DsgGovernedToolRequest['action'],
    goal: String(body.goal || '').trim(),
    args: asRecord(body.args),
    evidence: stringArray(body.evidence),
    history: stringArray(body.history),
    sandboxRoot: typeof body.sandboxRoot === 'string' ? body.sandboxRoot : undefined,
  };

  if (!['shell', 'file', 'browser', 'search', 'schedule', 'plan', 'workflow', 'api', 'google_workspace', 'persistent_compute'].includes(input.tool)) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_TOOL_UNSUPPORTED', message: 'tool is not supported by the governed DSG tooling layer' } }, { status: 400 });
  }

  const result = body.execute === true ? await executeGovernedToolRequest(input) : prepareGovernedToolRequest(input);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
