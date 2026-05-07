import { sha256Json } from '../runtime/hash';
import type { RiskLevel } from '../runtime/types';

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
};

export type OpenApiDocument = {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

export type GovernedTool = {
  name: string;
  method: string;
  path: string;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  schemaHash: string;
};

const mutationMethods = new Set(['post', 'put', 'patch', 'delete']);

export function classifyOperationRisk(method: string, operation: OpenApiOperation): RiskLevel {
  const text = `${method} ${operation.operationId ?? ''} ${operation.summary ?? ''} ${operation.description ?? ''}`.toLowerCase();
  if (text.includes('delete') || text.includes('payment') || text.includes('transfer')) return 'CRITICAL';
  if (mutationMethods.has(method.toLowerCase())) return 'HIGH';
  return 'MEDIUM';
}

export function openApiToGovernedTools(document: OpenApiDocument): GovernedTool[] {
  const paths = document.paths ?? {};
  const tools: GovernedTool[] = [];

  for (const path of Object.keys(paths).sort()) {
    const operations = paths[path];
    for (const method of Object.keys(operations).sort()) {
      const operation = operations[method];
      const riskLevel = classifyOperationRisk(method, operation);
      const name = operation.operationId ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`.replace(/^_+|_+$/g, '');
      tools.push({
        name,
        method: method.toUpperCase(),
        path,
        description: operation.summary ?? operation.description ?? name,
        riskLevel,
        requiresApproval: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
        schemaHash: sha256Json({ method, path, operation }),
      });
    }
  }

  return tools;
}


export type OpenApiFunctionDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  dsg: {
    method: string;
    path: string;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    schemaHash: string;
    truthBoundary: 'function_definition_only_not_runtime_evidence';
  };
};

function parameterSchema(operation: OpenApiOperation): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const parameter of operation.parameters ?? []) {
    if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) continue;
    const record = parameter as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    if (!name) continue;
    properties[name] = record.schema && typeof record.schema === 'object'
      ? record.schema
      : { type: 'string', description: typeof record.description === 'string' ? record.description : undefined };
    if (record.required === true) required.push(name);
  }

  if (operation.requestBody && typeof operation.requestBody === 'object' && !Array.isArray(operation.requestBody)) {
    const requestBody = operation.requestBody as Record<string, unknown>;
    properties.requestBody = requestBody;
    if (requestBody.required === true) required.push('requestBody');
  }

  return {
    type: 'object',
    properties,
    required: [...new Set(required)].sort(),
    additionalProperties: false,
  };
}

export function openApiToGovernedFunctionDefinitions(document: OpenApiDocument): OpenApiFunctionDefinition[] {
  return openApiToGovernedTools(document).map((tool) => {
    const operation = document.paths?.[tool.path]?.[tool.method.toLowerCase()] ?? {};
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: parameterSchema(operation),
      },
      dsg: {
        method: tool.method,
        path: tool.path,
        riskLevel: tool.riskLevel,
        requiresApproval: tool.requiresApproval,
        schemaHash: tool.schemaHash,
        truthBoundary: 'function_definition_only_not_runtime_evidence',
      },
    };
  });
}
