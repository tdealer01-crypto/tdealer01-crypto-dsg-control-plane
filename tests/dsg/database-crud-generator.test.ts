import { describe, expect, it } from "vitest";
import {
  generateMigration,
  generateMigrationArtifact,
} from "@/lib/dsg/app-builder/database-generator";
import {
  generateCrudRouteTemplate,
  generateCrudSpec,
  generateCrudTestContract,
} from "@/lib/dsg/app-builder/crud-generator";

const spec = {
  table: "tasks",
  fields: [
    { name: "title", type: "string" as const, required: true },
    { name: "done", type: "boolean" as const },
    { name: "metadata", type: "json" as const },
  ],
};

describe("database crud generator", () => {
  it("generates deterministic migration", () => {
    expect(generateMigration(spec)).toBe(generateMigration(spec));
    expect(
      generateMigrationArtifact(spec).migrationHash.startsWith("sha256:"),
    ).toBe(true);
  });

  it("blocks invalid table and fields", () => {
    expect(() => generateMigration({ table: "BadName", fields: [] })).toThrow(
      "DSG_TABLE_NOT_ALLOWED",
    );
    expect(() =>
      generateMigration({
        table: "tasks",
        fields: [{ name: "bad-name", type: "string" }],
      }),
    ).toThrow("DSG_FIELD_NOT_ALLOWED");
  });

  it("does not include destructive SQL", () => {
    const sql = generateMigration(spec).toLowerCase();

    expect(sql).not.toContain("drop table");
    expect(sql).not.toContain("truncate");
    expect(sql).not.toContain("delete from");
    expect(sql).not.toContain("alter table");
  });

  it("generates scoped CRUD spec", () => {
    expect(generateCrudSpec("tasks")).toEqual({
      table: "tasks",
      scope: ["workspace_id", "org_id"],
      ops: ["create", "read", "update", "delete"],
    });
  });

  it("generates route template with workspace/org scope", () => {
    const route = generateCrudRouteTemplate(spec);

    expect(route.path).toBe("app/api/generated/tasks/route.ts");
    expect(route.content).toContain("x-dsg-workspace-id");
    expect(route.content).toContain("x-dsg-org-id");
    expect(route.content).toContain(".eq('workspace_id', workspaceId)");
    expect(route.content).toContain(".eq('org_id', orgId)");
    expect(route.contentHash.startsWith("sha256:")).toBe(true);
  });

  it("generates CRUD test data contract", () => {
    const contract = generateCrudTestContract(spec);

    expect(contract.table).toBe("tasks");
    expect(contract.create.method).toBe("POST");
    expect(contract.read.method).toBe("GET");
    expect(contract.update.method).toBe("PATCH");
    expect(contract.delete.method).toBe("DELETE");
    expect(contract.contractHash.startsWith("sha256:")).toBe(true);
  });
});
