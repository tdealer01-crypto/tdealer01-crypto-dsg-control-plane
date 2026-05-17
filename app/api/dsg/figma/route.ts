import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { createRuntimeJob } from '@/lib/dsg/server/repository';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';

type FigmaField = {
  name: string;
  type: string;
};

type FigmaJobInput = {
  figmaUrl: string;
  goal?: string;
  dataType?: string;
  fields?: FigmaField[];
};

function extractFigmaFileKey(figmaUrl: string): string | null {
  const match = figmaUrl.match(/figma\.com\/(file|design)\/([A-Za-z0-9]+)/);
  return match ? match[2] : null;
}

export async function POST(request: Request) {
  const actor = await requireVerifiedDsgActor(request.headers, 'job:create');

  const body = (await request.json().catch(() => null)) as FigmaJobInput | null;

  if (!body?.figmaUrl?.trim()) {
    return NextResponse.json(
      { ok: false, error: { code: 'DSG_FIGMA_URL_REQUIRED' } },
      { status: 400 },
    );
  }

  const figmaUrl = body.figmaUrl.trim();
  const fileKey = extractFigmaFileKey(figmaUrl);

  if (!fileKey) {
    return NextResponse.json(
      { ok: false, error: { code: 'DSG_FIGMA_URL_INVALID' } },
      { status: 400 },
    );
  }

  let goal = body.goal?.trim() ?? '';

  if (!goal) {
    const parts: string[] = [
      'Generate a production-ready Next.js application that faithfully implements the design from the provided Figma file.',
    ];

    if (body.dataType) {
      parts.push(`The primary data type is "${body.dataType}".`);
    }

    if (body.fields?.length) {
      const fieldList = body.fields.map(f => `${f.name} (${f.type})`).join(', ');
      parts.push(`Fields: ${fieldList}.`);
    }

    parts.push('Match the layout, colors, typography, spacing, and components exactly as shown in the design.');
    parts.push('Include responsive behaviour, loading states, error handling, and empty states.');

    goal = parts.join(' ');
  }

  goal += `\n\nDesign reference (Figma): ${figmaUrl} — match the layout, colors, and components shown.`;

  const successCriteria = [
    { id: 'figma_layout', description: 'Layout matches the Figma design' },
    { id: 'figma_colors', description: 'Colors and typography match the Figma design' },
    { id: 'figma_components', description: 'Components reflect the Figma design' },
    { id: 'responsive', description: 'Application is responsive across viewport sizes' },
  ];

  if (body.dataType) {
    successCriteria.push({
      id: 'data_type',
      description: `Handles the "${body.dataType}" data type correctly`,
    });
  }

  try {
    const data = await createRuntimeJob(
      {
        workspaceId: actor.workspaceId,
        actorId: actor.actorId,
        userAccessToken: getBearerToken(request.headers),
      },
      { goal, successCriteria },
    );

    return NextResponse.json(
      {
        ok: true,
        data: {
          jobId: data.id,
          statusUrl: `/api/dsg/jobs/${data.id}`,
          figmaFileKey: fileKey,
          figmaUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_FIGMA_JOB_FAILED' } },
      { status: 403 },
    );
  }
}
