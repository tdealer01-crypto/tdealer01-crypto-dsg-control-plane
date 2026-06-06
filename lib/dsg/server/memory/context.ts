/**
 * Request context for DSG persistent memory operations.
 *
 * Identifies the workspace and actor on whose behalf memory is read or written,
 * along with the permission scopes granted to that actor for memory access.
 */

export type DsgMemoryRequestContext = {
  /** Workspace the memory rows belong to (org/workspace scoping). */
  workspaceId: string;
  /** Actor performing the memory operation. */
  actorId: string;
  /** Actor's role label (e.g. 'customer', 'operator'). */
  actorRole: string;
  /** Granted memory permission scopes (e.g. 'memory:read', 'memory:write'). */
  permissions: string[];
};

/** Whether the context grants a specific memory permission scope. */
export function hasMemoryPermission(ctx: DsgMemoryRequestContext, scope: string): boolean {
  return ctx.permissions.includes(scope);
}
