import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';
import {
  LaunchpadLaunchRow,
  mapLaunchpadRow,
  parseLaunchpadSections,
} from '@/lib/dsg/launchpad/types';

function errorStatus(message: string): number {
  if (message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED') return 403;
  if (message.startsWith('LAUNCHPAD_INVALID_')) return 400;
  return 500;
}

async function insertLaunch(row: {
  workspace_id: string;
  name: string;
  created_by: string;
  sections: unknown;
}): Promise<LaunchpadLaunchRow> {
  const config = getDsgSupabaseRpcConfig();
  const response = await fetch(`${config.url}/rest/v1/dsg_launchpad_launches`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `LAUNCHPAD_INSERT_${response.status}`);
  }

  const rows = text ? (JSON.parse(text) as LaunchpadLaunchRow[]) : [];
  if (!rows[0]) throw new Error('LAUNCHPAD_INSERT_EMPTY_RESPONSE');
  return rows[0];
}

export async function GET(req: Request) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'read:generated-apps');
    const config = getDsgSupabaseRpcConfig();
    const rows = await readDsgRest<LaunchpadLaunchRow[]>(config, 'dsg_launchpad_launches', {
      workspace_id: `eq.${actor.workspaceId}`,
      select: 'id,workspace_id,name,created_by,sections,created_at,updated_at',
      order: 'updated_at.desc',
    });

    return NextResponse.json({
      ok: true,
      data: {
        launches: rows.map(mapLaunchpadRow),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LAUNCHPAD_LIST_FAILED';
    return NextResponse.json(
      { ok: false, error: { code: message } },
      { status: errorStatus(message) },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'write:generated-apps');
    const body = (await req.json().catch(() => null)) as
      | { name?: unknown; sections?: unknown }
      | null;

    if (typeof body?.name !== 'string' || body.name.trim().length === 0 || body.name.length > 200) {
      throw new Error('LAUNCHPAD_INVALID_NAME');
    }

    const sections = parseLaunchpadSections(body.sections ?? []);
    if (!sections) throw new Error('LAUNCHPAD_INVALID_SECTIONS');

    const stored = await insertLaunch({
      workspace_id: actor.workspaceId,
      name: body.name.trim(),
      created_by: actor.actorId,
      sections,
    });

    return NextResponse.json(
      { ok: true, data: { launch: mapLaunchpadRow(stored) } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LAUNCHPAD_CREATE_FAILED';
    return NextResponse.json(
      { ok: false, error: { code: message } },
      { status: errorStatus(message) },
    );
  }
}
