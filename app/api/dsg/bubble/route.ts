import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { createRuntimeJob } from '@/lib/dsg/server/repository';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';

type BubbleField = {
  name: string;
  type: string;
};

type BubbleSchemaInput = {
  appDomain: string;
  dataType: string;
  fields: BubbleField[];
};

export async function POST(request: Request) {
  const actor = await requireVerifiedDsgActor(request.headers, 'job:create');

  const body = (await request.json().catch(() => null)) as BubbleSchemaInput | null;
  if (!body?.appDomain?.trim() || !body?.dataType?.trim() || !body?.fields?.length) {
    return NextResponse.json(
      { ok: false, error: { code: 'DSG_BUBBLE_SCHEMA_REQUIRED' } },
      { status: 400 },
    );
  }

  const fieldList = body.fields.map(f => `${f.name} (${f.type})`).join(', ');
  const bubbleApiBase = `https://${body.appDomain}/api/1.1/obj/${body.dataType.toLowerCase()}`;

  const goal = [
    `Generate a production-ready Next.js CRUD application for the Bubble data type "${body.dataType}".`,
    `Fields: ${fieldList}.`,
    `Connect to Bubble Data API at: ${bubbleApiBase}`,
    `The app must: list all records, create new records, edit existing records, and delete records via the Bubble API.`,
    `Design must be clean, responsive, and embeddable as an iframe inside a Bubble app.`,
    `Use Bearer token authentication for all Bubble API calls.`,
    `Include loading states, error handling, and empty states.`,
  ].join(' ');

  try {
    const data = await createRuntimeJob(
      {
        workspaceId: actor.workspaceId,
        actorId: actor.actorId,
        userAccessToken: getBearerToken(request.headers),
      },
      {
        goal,
        successCriteria: [
          { id: 'bubble_list', description: 'Lists records from Bubble Data API' },
          { id: 'bubble_create', description: 'Creates records via Bubble Data API' },
          { id: 'bubble_edit', description: 'Edits records via Bubble Data API' },
          { id: 'bubble_delete', description: 'Deletes records via Bubble Data API' },
          { id: 'iframe_embed', description: 'Embeds cleanly in Bubble iframe element' },
        ],
      },
    );

    return NextResponse.json(
      {
        ok: true,
        data: {
          jobId: data.id,
          statusUrl: `/api/dsg/jobs/${data.id}`,
          dataType: body.dataType,
          bubbleApiBase,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_BUBBLE_JOB_FAILED' } },
      { status: 403 },
    );
  }
}
