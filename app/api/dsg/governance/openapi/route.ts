import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json(
    {
      openapi: '3.1.0',
      info: {
        title: 'DSG Governance Plugin',
        version: '1.0.0',
        description:
          'Govern an existing AI agent action against an approved DSG plan. Observe/Enforce mode is owned by the DSG organization setting and cannot be overridden by the calling agent.',
      },
      servers: [{ url: origin }],
      paths: {
        '/api/dsg/governance/preflight': {
          post: {
            operationId: 'dsgGovernancePreflight',
            summary: 'Verify and record an agent action before target execution',
            security: [{ DsgApiKey: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GovernancePreflightInput' },
                },
              },
            },
            responses: {
              '200': {
                description: 'Governance decision and five-panel live status payload',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/GovernancePreflightResult' },
                  },
                },
              },
              '400': { description: 'Invalid governance input' },
              '401': { description: 'Invalid or missing DSG credential' },
              '403': { description: 'Authenticated actor lacks route access' },
              '503': { description: 'Server-side governance mode is unavailable' },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          DsgApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-dsg-api-key',
          },
        },
        schemas: {
          GovernancePreflightInput: {
            type: 'object',
            additionalProperties: false,
            properties: {
              eventId: { type: 'string' },
              planHash: { type: 'string', pattern: '^[0-9a-fA-F]{64}$' },
              agentId: { type: 'string' },
              sessionId: { type: 'string' },
              actionType: {
                type: 'string',
                enum: ['observe', 'read', 'write', 'delete', 'payment', 'deploy', 'admin'],
              },
              targetSystemId: { type: 'string' },
              operationName: { type: 'string' },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              payloadHash: { type: 'string' },
              idempotencyKey: { type: 'string' },
              rollbackPlanId: { type: 'string' },
              evidenceManifestId: { type: 'string' },
              policySnapshotHash: { type: 'string' },
              claimedOutcome: { type: 'string' },
              evidenceRefs: { type: 'array', items: { type: 'string' } },
            },
            required: [
              'eventId',
              'planHash',
              'agentId',
              'sessionId',
              'actionType',
              'targetSystemId',
              'operationName',
              'riskLevel',
            ],
          },
          GovernancePreflightResult: {
            type: 'object',
            properties: {
              ok: { type: 'boolean', const: true },
              mode: { type: 'string', enum: ['observe', 'enforce'] },
              status: {
                type: 'string',
                enum: ['PASS', 'BLOCKED', 'WAITING_PERMISSION', 'UNVERIFIED'],
              },
              policyAllowsAction: { type: 'boolean' },
              shouldBlock: { type: 'boolean' },
              claimAllowed: { type: 'boolean' },
              decisionHash: { type: 'string' },
              panels: {
                type: 'object',
                properties: {
                  action: { type: 'object', additionalProperties: true },
                  planAlignment: { type: 'object', additionalProperties: true },
                  permission: { type: 'object', additionalProperties: true },
                  evidence: { type: 'object', additionalProperties: true },
                  executionAudit: { type: 'object', additionalProperties: true },
                },
                required: ['action', 'planAlignment', 'permission', 'evidence', 'executionAudit'],
              },
            },
            required: [
              'ok',
              'mode',
              'status',
              'policyAllowsAction',
              'shouldBlock',
              'claimAllowed',
              'decisionHash',
              'panels',
            ],
          },
        },
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
