import { createHash } from "node:crypto";
import type { DsgTableSpec } from "./database-generator";
import { validateTableSpec } from "./database-generator";

export type CrudOperation = "create" | "read" | "update" | "delete";
export type CrudSpec = {
  table: string;
  scope: ["workspace_id", "org_id"];
  ops: CrudOperation[];
};
export type CrudRouteTemplate = {
  table: string;
  path: string;
  content: string;
  contentHash: string;
};
export type CrudTestContract = {
  table: string;
  create: Record<string, unknown>;
  read: Record<string, unknown>;
  update: Record<string, unknown>;
  delete: Record<string, unknown>;
  contractHash: string;
};

export function generateCrudSpec(table: string): CrudSpec {
  if (!/^[a-z][a-z0-9_]{1,62}$/.test(table))
    throw new Error("DSG_TABLE_NOT_ALLOWED");
  return {
    table,
    scope: ["workspace_id", "org_id"],
    ops: ["create", "read", "update", "delete"],
  };
}

export function generateCrudRouteTemplate(
  spec: DsgTableSpec,
): CrudRouteTemplate {
  validateTableSpec(spec);
  const content = `import { NextResponse } from 'next/server';\nimport { getSupabaseAdmin } from '@/lib/supabase-server';\n\nconst TABLE = '${spec.table}';\n\nfunction requireScope(request: Request) {\n  const workspaceId = request.headers.get('x-dsg-workspace-id');\n  const orgId = request.headers.get('x-dsg-org-id');\n\n  if (!workspaceId || !orgId) {\n    throw new Error('DSG_CRUD_SCOPE_REQUIRED');\n  }\n\n  return { workspaceId, orgId };\n}\n\nexport async function GET(request: Request) {\n  try {\n    const { workspaceId, orgId } = requireScope(request);\n    const db = getSupabaseAdmin();\n\n    const { data, error } = await db\n      .from(TABLE)\n      .select('*')\n      .eq('workspace_id', workspaceId)\n      .eq('org_id', orgId)\n      .order('created_at', { ascending: false });\n\n    if (error) throw error;\n    return NextResponse.json({ ok: true, data });\n  } catch (error) {\n    return NextResponse.json({ ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_READ_FAILED' } }, { status: 400 });\n  }\n}\n\nexport async function POST(request: Request) {\n  try {\n    const { workspaceId, orgId } = requireScope(request);\n    const body = await request.json();\n    const db = getSupabaseAdmin();\n\n    const { data, error } = await db\n      .from(TABLE)\n      .insert({ ...body, workspace_id: workspaceId, org_id: orgId })\n      .select()\n      .single();\n\n    if (error) throw error;\n    return NextResponse.json({ ok: true, data }, { status: 201 });\n  } catch (error) {\n    return NextResponse.json({ ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_CREATE_FAILED' } }, { status: 400 });\n  }\n}\n\nexport async function PATCH(request: Request) {\n  try {\n    const { workspaceId, orgId } = requireScope(request);\n    const body = await request.json();\n    const id = body?.id;\n\n    if (!id) throw new Error('DSG_CRUD_ID_REQUIRED');\n\n    const { id: _id, workspace_id: _workspaceId, org_id: _orgId, ...patch } = body;\n    const db = getSupabaseAdmin();\n\n    const { data, error } = await db\n      .from(TABLE)\n      .update(patch)\n      .eq('id', id)\n      .eq('workspace_id', workspaceId)\n      .eq('org_id', orgId)\n      .select()\n      .single();\n\n    if (error) throw error;\n    return NextResponse.json({ ok: true, data });\n  } catch (error) {\n    return NextResponse.json({ ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_UPDATE_FAILED' } }, { status: 400 });\n  }\n}\n\nexport async function DELETE(request: Request) {\n  try {\n    const { workspaceId, orgId } = requireScope(request);\n    const { searchParams } = new URL(request.url);\n    const id = searchParams.get('id');\n\n    if (!id) throw new Error('DSG_CRUD_ID_REQUIRED');\n\n    const db = getSupabaseAdmin();\n\n    const { error } = await db\n      .from(TABLE)\n      .delete()\n      .eq('id', id)\n      .eq('workspace_id', workspaceId)\n      .eq('org_id', orgId);\n\n    if (error) throw error;\n    return NextResponse.json({ ok: true, data: { id } });\n  } catch (error) {\n    return NextResponse.json({ ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CRUD_DELETE_FAILED' } }, { status: 400 });\n  }\n}\n`;
  return {
    table: spec.table,
    path: `app/api/generated/${spec.table}/route.ts`,
    content,
    contentHash: sha256(content),
  };
}

export function generateCrudTestContract(spec: DsgTableSpec): CrudTestContract {
  validateTableSpec(spec);
  const createPayload: Record<string, unknown> = {};
  const updatePayload: Record<string, unknown> = {};
  for (const field of spec.fields) {
    createPayload[field.name] = sampleValue(field.type, "create");
    updatePayload[field.name] = sampleValue(field.type, "update");
  }
  const contractWithoutHash = {
    table: spec.table,
    create: {
      method: "POST",
      headers: ["x-dsg-workspace-id", "x-dsg-org-id"],
      payload: createPayload,
      expect: { ok: true, status: 201 },
    },
    read: {
      method: "GET",
      headers: ["x-dsg-workspace-id", "x-dsg-org-id"],
      expect: { ok: true, containsCreatedRecord: true },
    },
    update: {
      method: "PATCH",
      headers: ["x-dsg-workspace-id", "x-dsg-org-id"],
      payload: { id: "<created.id>", ...updatePayload },
      expect: { ok: true, updated: updatePayload },
    },
    delete: {
      method: "DELETE",
      headers: ["x-dsg-workspace-id", "x-dsg-org-id"],
      query: { id: "<created.id>" },
      expect: { ok: true },
    },
  };
  return {
    ...contractWithoutHash,
    contractHash: sha256(JSON.stringify(contractWithoutHash)),
  };
}

function sampleValue(
  type: DsgTableSpec["fields"][number]["type"],
  mode: "create" | "update",
): unknown {
  switch (type) {
    case "string":
      return mode === "create" ? "DSG Test Item" : "DSG Updated Item";
    case "number":
      return mode === "create" ? 1 : 2;
    case "boolean":
      return mode === "create";
    case "timestamp":
      return "2026-01-01T00:00:00.000Z";
    case "uuid":
      return mode === "create"
        ? "00000000-0000-4000-8000-000000000001"
        : "00000000-0000-4000-8000-000000000002";
    case "json":
      return { source: "dsg-test-contract", mode };
    default:
      throw new Error(`DSG_FIELD_TYPE_NOT_ALLOWED:${String(type)}`);
  }
}
function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
