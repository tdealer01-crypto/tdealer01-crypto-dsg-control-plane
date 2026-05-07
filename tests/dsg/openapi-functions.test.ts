import { describe, expect, it } from 'vitest';
import { openApiToGovernedFunctionDefinitions } from '../../lib/dsg/connectors/openapi';

describe('OpenAPI governed function definitions', () => {
  it('converts operations into gated function definitions without runtime claims', () => {
    const functions = openApiToGovernedFunctionDefinitions({
      openapi: '3.0.0',
      paths: {
        '/events': {
          get: { operationId: 'listEvents', summary: 'List events' },
          post: {
            operationId: 'createEvent',
            summary: 'Create event',
            requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          },
        },
        '/events/{id}': {
          delete: {
            operationId: 'deleteEvent',
            summary: 'Delete event',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          },
        },
      },
    });

    expect(functions.map((fn) => fn.function.name)).toEqual(['listEvents', 'createEvent', 'deleteEvent']);
    expect(functions[0].dsg.requiresApproval).toBe(false);
    expect(functions[1].dsg.requiresApproval).toBe(true);
    expect(functions[2].dsg.riskLevel).toBe('CRITICAL');
    expect(functions[2].function.parameters.required).toEqual(['id']);
    expect(functions.every((fn) => fn.dsg.truthBoundary === 'function_definition_only_not_runtime_evidence')).toBe(true);
  });
});
