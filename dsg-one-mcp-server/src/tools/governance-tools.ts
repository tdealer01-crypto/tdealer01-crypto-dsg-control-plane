import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpineService } from '../services/spine-service.js';
import { DSGBrainService } from '../services/dsg-brain-service.js';
import { ComplianceService } from '../services/compliance-service.js';
import {
  SpineExecuteSchema,
  SpineEvidenceSchema,
  DSGPlanSchema,
  CredentialBrokerSchema,
  ComplianceEvidenceSchema,
  GateEvaluationSchema,
} from '../schemas/index.js';
import { formatError } from '../utils/errors.js';

export function createSpineTools(spineService: SpineService): Tool[] {
  return [
    {
      name: 'spine_execute_governed',
      description: 'Execute a governed operation through the spine pipeline',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
          intent: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              parameters: { type: 'object' },
            },
            description: 'Execution intent',
          },
          approve: { type: 'boolean', description: 'Auto-approve execution', default: false },
        },
        required: ['agentId', 'intent'],
      },
      handler: async (input: any) => {
        try {
          const result = await spineService.executeGoverned(input.agentId, input.intent, input.approve);
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'spine_get_execution_status',
      description: 'Check the status of a governed execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'Execution ID' },
        },
        required: ['executionId'],
      },
      handler: async (input: any) => {
        try {
          const status = await spineService.getExecutionStatus(input.executionId);
          return {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'spine_commit_evidence',
      description: 'Commit audit evidence for an execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'Execution ID' },
          evidence: {
            type: 'object',
            properties: {
              decision: { type: 'string' },
              reason: { type: 'string' },
              proof: { type: 'object' },
              trace: { type: 'array' },
            },
            description: 'Evidence data',
          },
        },
        required: ['executionId', 'evidence'],
      },
      handler: async (input: any) => {
        try {
          const result = await spineService.commitEvidence(input.executionId, input.evidence);
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'spine_check_quota',
      description: 'Verify rate limits and quota for an agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
        },
        required: ['agentId'],
      },
      handler: async (input: any) => {
        try {
          const quota = await spineService.checkQuota(input.agentId);
          return {
            type: 'text',
            text: `Quota Status:\nAvailable: ${quota.available}\nUsed: ${quota.used}/${quota.limit}\nUsage: ${quota.percentUsed.toFixed(1)}%`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}

export function createDSGBrainTools(dsgBrainService: DSGBrainService): Tool[] {
  return [
    {
      name: 'dsg_propose_plan',
      description: 'Propose an execution plan for a complex objective',
      inputSchema: {
        type: 'object',
        properties: {
          objective: { type: 'string', description: 'Planning objective' },
          context: { type: 'object', description: 'Planning context' },
          constraints: { type: 'array', items: { type: 'string' }, description: 'Execution constraints' },
        },
        required: ['objective'],
      },
      handler: async (input: any) => {
        try {
          const plan = await dsgBrainService.proposePlan(input.objective, input.context, input.constraints);
          return {
            type: 'text',
            text: JSON.stringify(plan, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_broker_credentials',
      description: 'Request a credential lease from the broker',
      inputSchema: {
        type: 'object',
        properties: {
          secretName: { type: 'string', description: 'Secret identifier' },
          scope: { type: 'string', description: 'Secret scope/environment' },
          leaseDuration: { type: 'number', description: 'Lease duration in seconds', default: 3600 },
        },
        required: ['secretName'],
      },
      handler: async (input: any) => {
        try {
          const credential = await dsgBrainService.brokerCredential(
            input.secretName,
            input.scope,
            input.leaseDuration
          );
          return {
            type: 'text',
            text: `Credential Lease:\nFingerprint: ${credential.fingerprint}\nExpires: ${credential.expiresAt.toISOString()}\n\n⚠️  Lease token is redacted for security`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_validate_conformance',
      description: 'Validate that execution conforms to an approved plan',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'Execution ID' },
          planHash: { type: 'string', description: 'Plan hash' },
          executedCommands: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                path: { type: 'string' },
                result: { type: 'object' },
              },
            },
            description: 'Executed commands',
          },
        },
        required: ['executionId', 'planHash', 'executedCommands'],
      },
      handler: async (input: any) => {
        try {
          const result = await dsgBrainService.validateConformance(
            input.executionId,
            input.planHash,
            input.executedCommands
          );
          return {
            type: 'text',
            text: result.conformant
              ? 'Execution conforms to plan ✓'
              : `Conformance violations:\n${result.violations?.join('\n')}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}

export function createComplianceTools(complianceService: ComplianceService): Tool[] {
  return [
    {
      name: 'ccvs_collect_evidence',
      description: 'Collect compliance evidence at a specific level (L1-L5)',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'Execution ID' },
          level: {
            type: 'string',
            enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
            description: 'Evidence level',
          },
          metadata: { type: 'object', description: 'Evidence metadata' },
        },
        required: ['executionId', 'level'],
      },
      handler: async (input: any) => {
        try {
          const evidence = await complianceService.collectEvidence(
            input.executionId,
            input.level,
            input.metadata
          );
          return {
            type: 'text',
            text: `Evidence Collected:\nLevel: ${evidence.level}\nHash: ${evidence.hash}\nTimestamp: ${evidence.timestamp.toISOString()}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'ccvs_generate_audit_report',
      description: 'Generate a compliance audit report for an execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: { type: 'string', description: 'Execution ID' },
          scope: { type: 'string', description: 'Report scope' },
        },
        required: ['executionId'],
      },
      handler: async (input: any) => {
        try {
          const report = await complianceService.generateAuditReport(input.executionId, input.scope);
          return {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'ccvs_verify_proof',
      description: 'Verify a formal proof against constraints',
      inputSchema: {
        type: 'object',
        properties: {
          proofId: { type: 'string', description: 'Proof ID' },
          constraints: { type: 'object', description: 'Z3 constraints' },
        },
        required: ['proofId', 'constraints'],
      },
      handler: async (input: any) => {
        try {
          const result = await complianceService.verifyProof(input.proofId, input.constraints);
          return {
            type: 'text',
            text: result.valid
              ? `Proof verified ✓\nResult: ${JSON.stringify(result.result)}`
              : `Proof invalid\nError: ${result.error}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'ccvs_list_audit_logs',
      description: 'Query audit logs for compliance tracking',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Filter by agent ID' },
          limit: { type: 'number', description: 'Number of logs', default: 100 },
          offset: { type: 'number', description: 'Offset for pagination', default: 0 },
        },
      },
      handler: async (input: any) => {
        try {
          const logs = await complianceService.listAuditLogs(input.agentId, input.limit || 100, input.offset || 0);
          return {
            type: 'text',
            text: JSON.stringify(logs, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}
