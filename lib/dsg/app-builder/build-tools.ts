/**
 * App Builder server-side tool identifiers and descriptors.
 *
 * These names identify the governed App Builder tool calls exposed through the
 * agent runtime service registry. They are stable string identifiers used as
 * service ids and in tool-call routing. Keeping them centralized avoids
 * stringly-typed drift between the registry and the route handlers.
 */

/** Tool that provisions the runtime environment + action-layer contract after plan approval. */
export const APP_BUILDER_AGENT_RUNTIME_TOOL_NAME = 'dsg.app_builder.agent_runtime' as const;

/** Tool that generates a full-stack GitHub pull request from an approved plan. */
export const APP_BUILDER_BUILD_TOOL_NAME = 'dsg.app_builder.build' as const;

export type AppBuilderToolName =
  | typeof APP_BUILDER_AGENT_RUNTIME_TOOL_NAME
  | typeof APP_BUILDER_BUILD_TOOL_NAME;

export type AppBuilderToolDescriptor = {
  name: AppBuilderToolName;
  label: string;
  /** Secrets required server-side before the tool can run. Names only, never values. */
  requiredSecrets: string[];
  /** Whether the tool requires an approved plan before execution. */
  requiresApproval: boolean;
};

export const APP_BUILDER_TOOLS: Record<AppBuilderToolName, AppBuilderToolDescriptor> = {
  [APP_BUILDER_AGENT_RUNTIME_TOOL_NAME]: {
    name: APP_BUILDER_AGENT_RUNTIME_TOOL_NAME,
    label: 'Launch App Builder agent runtime',
    requiredSecrets: ['GITHUB_TOKEN'],
    requiresApproval: true,
  },
  [APP_BUILDER_BUILD_TOOL_NAME]: {
    name: APP_BUILDER_BUILD_TOOL_NAME,
    label: 'Generate full-stack GitHub PR',
    requiredSecrets: ['GITHUB_TOKEN'],
    requiresApproval: true,
  },
};

/** Whether a string is a known App Builder tool name. */
export function isAppBuilderToolName(value: string): value is AppBuilderToolName {
  return value === APP_BUILDER_AGENT_RUNTIME_TOOL_NAME || value === APP_BUILDER_BUILD_TOOL_NAME;
}

/** Resolve a tool descriptor by name, or null when unknown. */
export function getAppBuilderTool(name: string): AppBuilderToolDescriptor | null {
  return isAppBuilderToolName(name) ? APP_BUILDER_TOOLS[name] : null;
}
