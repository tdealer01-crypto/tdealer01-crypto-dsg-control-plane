import { createHash } from "node:crypto";

export type DsgFieldType =
  | "string"
  | "number"
  | "boolean"
  | "timestamp"
  | "uuid"
  | "json";

export type DsgTableField = {
  name: string;
  type: DsgFieldType;
  required?: boolean;
};

export type DsgTableSpec = {
  table: string;
  fields: DsgTableField[];
};

export type DsgMigrationResult = {
  table: string;
  sql: string;
  migrationHash: string;
};

const NAME = /^[a-z][a-z0-9_]{1,62}$/;

export function generateMigration(specOrTable: DsgTableSpec | string): string {
  return generateMigrationArtifact(normalizeSpec(specOrTable)).sql;
}

export function generateMigrationArtifact(
  spec: DsgTableSpec,
): DsgMigrationResult {
  const normalized = normalizeSpec(spec);
  validateTableSpec(normalized);

  const fieldSql = normalized.fields
    .map(
      (field) =>
        `  ${field.name} ${toSqlType(field.type)}${field.required ? " not null" : ""}`,
    )
    .sort();

  const sql = [
    `create table if not exists ${normalized.table} (`,
    "  id uuid primary key default gen_random_uuid(),",
    "  workspace_id uuid not null,",
    "  org_id uuid not null,",
    ...fieldSql.map((line) => `${line},`),
    "  created_at timestamptz not null default now(),",
    "  updated_at timestamptz not null default now()",
    ");",
    "",
    `create index if not exists ${normalized.table}_workspace_idx on ${normalized.table} (workspace_id);`,
    `create index if not exists ${normalized.table}_org_idx on ${normalized.table} (org_id);`,
  ].join("\n");

  assertNoDestructiveSql(sql);

  return {
    table: normalized.table,
    sql,
    migrationHash: sha256(sql),
  };
}

export function validateTableSpec(spec: DsgTableSpec): void {
  if (!NAME.test(spec.table)) throw new Error("DSG_TABLE_NOT_ALLOWED");
  const seen = new Set([
    "id",
    "workspace_id",
    "org_id",
    "created_at",
    "updated_at",
  ]);

  for (const field of spec.fields) {
    if (!NAME.test(field.name))
      throw new Error(`DSG_FIELD_NOT_ALLOWED:${field.name}`);
    if (seen.has(field.name))
      throw new Error(`DSG_FIELD_RESERVED_OR_DUPLICATE:${field.name}`);
    seen.add(field.name);
    toSqlType(field.type);
  }
}

function normalizeSpec(specOrTable: DsgTableSpec | string): DsgTableSpec {
  if (typeof specOrTable === "string") {
    return {
      table: specOrTable,
      fields: [],
    };
  }

  return {
    table: specOrTable.table,
    fields: [...specOrTable.fields].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}

function toSqlType(type: DsgFieldType): string {
  switch (type) {
    case "string":
      return "text";
    case "number":
      return "numeric";
    case "boolean":
      return "boolean";
    case "timestamp":
      return "timestamptz";
    case "uuid":
      return "uuid";
    case "json":
      return "jsonb";
    default:
      throw new Error(`DSG_FIELD_TYPE_NOT_ALLOWED:${String(type)}`);
  }
}

function assertNoDestructiveSql(sql: string): void {
  const lowered = sql.toLowerCase();
  const forbidden = [
    "drop table",
    "drop column",
    "truncate ",
    "delete from ",
    "alter table",
  ];
  for (const word of forbidden) {
    if (lowered.includes(word))
      throw new Error(`DSG_DESTRUCTIVE_SQL_BLOCKED:${word.trim()}`);
  }
}

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
