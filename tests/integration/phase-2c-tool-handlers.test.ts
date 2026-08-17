/**
 * Phase 2C: MCP Tool Handlers Integration Tests
 *
 * Tests for the 4 core DSG Verified Execution tools:
 * 1. plan_alignment - Verify actions align with approved plans
 * 2. constraint_evaluate - Evaluate governance constraints
 * 3. execution_proof_request - Generate cryptographic proofs
 * 4. evidence_retrieve - Fetch audit trails
 *
 * Phase 2C-1: Local Setup Validation (Day 1)
 *   - MCP server connectivity
 *   - Tool routing and detection
 *   - Deterministic proof generation
 *   - Mock data responses
 *
 * Phase 2C-2: Tool-by-Tool Integration (Days 2-3)
 *   - plan_alignment with Unify plan storage
 *   - constraint_evaluate with DSG policies
 *   - execution_proof_request with determinism validation
 *   - evidence_retrieve with Supabase audit trail
 *
 * Phase 2C-3: Cross-Tool Validation (Day 4)
 *   - Full workflow: align → evaluate → execute → proof → evidence
 *   - Lineage and traceability
 *   - No data loss in Supabase
 *
 * Phase 2C-4: Documentation & Handoff (Day 5)
 *   - Test result summary
 *   - API documentation updates
 *   - Phase 3 requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDeterministicProof,
  handlePlanAlignmentTool,
  handleConstraintEvaluateTool,
  handleExecutionProofTool,
  handleEvidenceRetrieveTool,
  routeToolRequest,
  type DsgToolRequest,
  type DsgToolResponse,
} from '@/lib/spine/tool-handlers';

describe('Phase 2C: DSG Verified Execution Tools', () => {
  describe('Phase 2C-1: Deterministic Proof Generation', () => {
    it('should generate deterministic proof from input', () => {
      const input = {
        agent_id: 'agent-test-001',
        action: 'write_audit_log',
        plan_hash: 'sha256:abc123',
        result: { success: true, rows_affected: 1 },
      };

      const proof = generateDeterministicProof(input);

      expect(proof).toHaveProperty('hash');
      expect(proof).toHaveProperty('schema');
      expect(proof).toHaveProperty('timestamp');
      expect(proof).toHaveProperty('canonical_input');
      expect(proof.schema).toBe('dsg-v1-proof');
      expect(proof.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should produce identical hash for identical input', () => {
      const input = {
        agent_id: 'agent-test-001',
        action: 'write_audit_log',
        plan_hash: 'sha256:abc123',
        result: { success: true },
      };

      const proof1 = generateDeterministicProof(input);
      const proof2 = generateDeterministicProof(input);

      expect(proof1.hash).toBe(proof2.hash);
    });

    it('should produce different hash for different input', () => {
      const input1 = {
        agent_id: 'agent-001',
        action: 'action-a',
        plan_hash: 'hash1',
        result: { data: 'x' },
      };

      const input2 = {
        agent_id: 'agent-002',
        action: 'action-b',
        plan_hash: 'hash2',
        result: { data: 'y' },
      };

      const proof1 = generateDeterministicProof(input1);
      const proof2 = generateDeterministicProof(input2);

      expect(proof1.hash).not.toBe(proof2.hash);
    });

    it('should handle type guards correctly for undefined values', () => {
      const input = {
        agent_id: undefined,
        action: null,
        plan_hash: 'sha256:test',
        result: null,
      };

      const proof = generateDeterministicProof(input as any);

      expect(proof.hash).toBeDefined();
      expect(proof.canonical_input).toContain('"agent_id":""');
      expect(proof.canonical_input).toContain('"action":""');
    });
  });

  describe('Phase 2C-1: Tool Routing and Detection', () => {
    it('should route plan_alignment requests correctly', async () => {
      const request: DsgToolRequest = {
        agent_id: 'agent-001',
        action: 'update_config',
        params: {
          tool: 'plan_alignment',
          plan_hash: 'sha256:abc123',
          context: { config_key: 'feature_flags' },
        },
      };

      const response = await routeToolRequest(request, 'org-001', 'agent-001');

      expect(response.decision).toBeDefined();
      expect(['ALLOW', 'BLOCK', 'REVIEW']).toContain(response.decision);
      expect(response.reason).toBeDefined();
    });

    it('should route constraint_evaluate requests correctly', async () => {
      const request: DsgToolRequest = {
        agent_id: 'agent-001',
        action: 'delete_backup',
        params: {
          tool: 'constraint_evaluate',
          target_resource: 'backup_storage',
          risk_level: 'high',
        },
      };

      const response = await routeToolRequest(request, 'org-001', 'agent-001');

      expect(response.decision).toBeDefined();
      expect(['ALLOW', 'BLOCK', 'REVIEW']).toContain(response.decision);
    });

    it('should route execution_proof_request correctly', async () => {
      const request: DsgToolRequest = {
        agent_id: 'agent-001',
        action: 'write_log',
        params: {
          tool: 'execution_proof_request',
          result: { success: true, rows_affected: 1 },
          plan_hash: 'sha256:abc123',
        },
      };

      const response = await routeToolRequest(request, 'org-001', 'agent-001');

      expect(response.decision).toBe('ALLOW');
      expect(response.proof).toBeDefined();
      expect(response.execution_id).toBeDefined();
    });

    it('should route evidence_retrieve correctly', async () => {
      const request: DsgToolRequest = {
        agent_id: 'agent-001',
        action: 'query_evidence',
        params: {
          tool: 'evidence_retrieve',
          execution_id: 'exec-123',
        },
      };

      const response = await routeToolRequest(request, 'org-001', 'agent-001');

      expect(response.decision).toBe('ALLOW');
      expect(response.evidence).toBeDefined();
      expect(Array.isArray(response.evidence.lineage)).toBe(true);
    });

    it('should reject unknown tool names', async () => {
      const request: DsgToolRequest = {
        agent_id: 'agent-001',
        action: 'unknown_action',
        params: {
          tool: 'unknown_tool',
        },
      };

      const response = await routeToolRequest(request, 'org-001', 'agent-001');

      expect(response.decision).toBe('BLOCK');
      expect(response.reason).toContain('Unknown tool');
    });
  });

  describe('Phase 2C-2: Tool-Specific Behavior', () => {
    describe('plan_alignment', () => {
      it('should require plan_hash', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'update_config',
          params: {
            tool: 'plan_alignment',
            // Missing plan_hash
          },
        };

        const response = await handlePlanAlignmentTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('BLOCK');
        expect(response.reason).toContain('plan_hash is required');
      });

      it('should return ALLOW for valid plan alignment', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'update_config',
          params: {
            tool: 'plan_alignment',
            plan_hash: 'sha256:abc123',
            context: { key: 'value' },
          },
        };

        const response = await handlePlanAlignmentTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('ALLOW');
        expect(response.execution_id).toContain('plan-align-');
      });
    });

    describe('constraint_evaluate', () => {
      it('should require target_resource', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'delete_backup',
          params: {
            tool: 'constraint_evaluate',
            // Missing target_resource
            risk_level: 'high',
          },
        };

        const response = await handleConstraintEvaluateTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('BLOCK');
        expect(response.reason).toContain('target_resource is required');
      });

      it('should return ALLOW for low-risk actions', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'read_data',
          params: {
            tool: 'constraint_evaluate',
            target_resource: 'users_table',
            risk_level: 'low',
          },
        };

        const response = await handleConstraintEvaluateTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('ALLOW');
      });

      it('should return REVIEW for medium-risk actions', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'modify_config',
          params: {
            tool: 'constraint_evaluate',
            target_resource: 'config_table',
            risk_level: 'medium',
          },
        };

        const response = await handleConstraintEvaluateTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('REVIEW');
      });

      it('should return BLOCK for high-risk actions', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'delete_user',
          params: {
            tool: 'constraint_evaluate',
            target_resource: 'users_table',
            risk_level: 'high',
          },
        };

        const response = await handleConstraintEvaluateTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('BLOCK');
      });
    });

    describe('execution_proof_request', () => {
      it('should require result parameter', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'write_log',
          params: {
            tool: 'execution_proof_request',
            // Missing result
            plan_hash: 'sha256:abc123',
          },
        };

        const response = await handleExecutionProofTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('BLOCK');
        expect(response.reason).toContain('result is required');
      });

      it('should generate proof for valid execution result', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'write_log',
          params: {
            tool: 'execution_proof_request',
            result: { success: true, rows_affected: 1, timestamp: '2024-08-17T12:00:00Z' },
            plan_hash: 'sha256:abc123',
          },
        };

        const response = await handleExecutionProofTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('ALLOW');
        expect(response.proof).toBeDefined();
        expect(response.proof?.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(response.proof?.schema).toBe('dsg-v1-proof');
        expect(response.execution_id).toContain('proof-');
      });

      it('should include canonical input in proof', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'test_action',
          params: {
            tool: 'execution_proof_request',
            result: { data: 'test' },
            plan_hash: 'sha256:test',
          },
        };

        const response = await handleExecutionProofTool(request, 'org-001', 'agent-001');

        expect(response.proof?.canonical_input).toBeDefined();
        expect(response.proof?.canonical_input).toContain('agent_id');
        expect(response.proof?.canonical_input).toContain('action');
      });
    });

    describe('evidence_retrieve', () => {
      it('should return mock evidence for Phase 2', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'query_evidence',
          params: {
            tool: 'evidence_retrieve',
            execution_id: 'exec-123',
          },
        };

        const response = await handleEvidenceRetrieveTool(request, 'org-001', 'agent-001');

        expect(response.decision).toBe('ALLOW');
        expect(response.evidence).toBeDefined();
        expect(response.evidence?.execution_trace).toBeDefined();
        expect(response.evidence?.lineage).toBeDefined();
        expect(Array.isArray(response.evidence?.lineage)).toBe(true);
      });

      it('should use execution_id from params if provided', async () => {
        const request: DsgToolRequest = {
          agent_id: 'agent-001',
          action: 'query_evidence',
          params: {
            tool: 'evidence_retrieve',
            execution_id: 'custom-exec-456',
          },
        };

        const response = await handleEvidenceRetrieveTool(request, 'org-001', 'agent-001');

        expect(response.evidence?.execution_trace).toBeDefined();
        const mockTrace = response.evidence?.execution_trace as any;
        expect(mockTrace.records?.[0]?.id).toBe('custom-exec-456');
      });
    });
  });

  describe('Phase 2C-2: Response Contract Validation', () => {
    it('should return valid DsgToolResponse for all tools', async () => {
      const tools = ['plan_alignment', 'constraint_evaluate', 'execution_proof_request', 'evidence_retrieve'];

      for (const tool of tools) {
        let request: DsgToolRequest;

        switch (tool) {
          case 'plan_alignment':
            request = {
              agent_id: 'agent-001',
              action: 'test',
              params: { tool, plan_hash: 'sha256:test' },
            };
            break;
          case 'constraint_evaluate':
            request = {
              agent_id: 'agent-001',
              action: 'test',
              params: { tool, target_resource: 'test', risk_level: 'low' },
            };
            break;
          case 'execution_proof_request':
            request = {
              agent_id: 'agent-001',
              action: 'test',
              params: { tool, result: { test: true } },
            };
            break;
          case 'evidence_retrieve':
            request = {
              agent_id: 'agent-001',
              action: 'test',
              params: { tool, execution_id: 'test-id' },
            };
            break;
          default:
            continue;
        }

        const response = await routeToolRequest(request, 'org-001', 'agent-001');

        expect(response).toHaveProperty('decision');
        expect(response).toHaveProperty('reason');
        expect(['ALLOW', 'BLOCK', 'REVIEW']).toContain(response.decision);
        expect(typeof response.reason).toBe('string');
      }
    });
  });
});
