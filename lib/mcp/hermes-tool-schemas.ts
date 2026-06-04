import { DSG_TOOLS } from '@/lib/agent/tools';

function buildInputSchema(parameters: Record<string, { type: string; required: boolean; description: string }>) {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const [key, def] of Object.entries(parameters)) {
    properties[key] = { type: def.type, description: def.description };
    if (def.required) required.push(key);
  }

  return {
    type: 'object' as const,
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: true,
  };
}

export const HERMES_TOOL_SCHEMAS = DSG_TOOLS.map((tool) => ({
  name: `hermes.${tool.id}`,
  description: `[${tool.riskLevel.toUpperCase()}] ${tool.description}`,
  inputSchema: buildInputSchema(tool.parameters),
}));

export const HERMES_TOOL_NAMES = HERMES_TOOL_SCHEMAS.map((s) => s.name);
export type HermesToolName = string;
