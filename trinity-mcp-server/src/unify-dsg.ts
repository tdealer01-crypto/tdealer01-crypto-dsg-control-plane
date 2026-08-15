#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const DSG_ONE_API_URL = (process.env.DSG_ONE_API_URL || process.env.TRINITY_API_URL || '').replace(/\/$/, '');
const DSG_ONE_TOKEN = process.env.DSG_ONE_TOKEN || process.env.TRINITY_JWT_TOKEN;

if (!DSG_ONE_API_URL) {
  throw new Error('DSG_ONE_API_URL or TRINITY_API_URL is required');
}

const server = new Server(
  { name: 'trinity-unify-dsg-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: 'unify_verify_action',
    description:
      'Verify an Unify Desktop Assistant action through the real Makk-8/Z3 verifier and then the DSG ONE agent command gate. Returns ALLOW only when both stages pass. This tool does not execute desktop, browser, or shell actions.',
    inputSchema: {
      type: 'object',
      properties: {
        formalContext: {
          type: 'object',
          properties: {
            is_grounded: { type: 'boolean' },
            is_api_clean: { type: 'boolean' },
            source_verified: { type: 'boolean' },
            has_audit_trail: { type: 'boolean' },
            nonce_lock: { type: 'boolean' },
            value: { type: 'number' },
            intent_score: { type: 'number' },
            compute_cost: { type: 'number' },
          },
          required: [
            'is_grounded',
            'is_api_clean',
            'source_verified',
            'has_audit_trail',
            'nonce_lock',
            'value',
            'intent_score',
            'compute_cost',
          ],
        },
        gateRequest: {
          type: 'object',
          description: 'Complete AgentCommandGateRequest accepted by /api/dsg/agent-command-gate.',
        },
      },
      required: ['formalContext', 'gateRequest'],
    },
  },
  {
    name: 'unify_record_result',
    description:
      'Record the observed result of an already ALLOWed Unify action. The result must carry the envelopeId, decisionHash, observedResultHash, and local evidence item id from the governed execution.',
    inputSchema: {
      type: 'object',
      properties: {
        result: {
          type: 'object',
          description: 'AgentActionResultRequest for /api/dsg/agent-command-gate/result.',
        },
      },
      required: ['result'],
    },
  },
  {
    name: 'unify_replay_evidence',
    description:
      'Replay Unify local evidence: verify its canonical SHA-256 evidence hash and re-run the same Makk-8/Z3 formal context. Returns REPLAY_VERIFIED only if both evidence integrity and the formal proof hash match.',
    inputSchema: {
      type: 'object',
      properties: {
        evidence: { type: 'object' },
        formalContext: { type: 'object' },
      },
      required: ['evidence', 'formalContext'],
    },
  },
  {
    name: 'unify_chain_status',
    description:
      'Return the enforced Unify governed execution order and the truth boundary between verification and local execution.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as Record<string, unknown>;

  try {
    if (name === 'unify_verify_action') {
      const formalContext = asRecord(args.formalContext, 'formalContext');
      const gateRequest = asRecord(args.gateRequest, 'gateRequest');
      const formal = await postDecision('/api/dsg/makk8-z3/verify', { context: formalContext });
      const formalAllowed = formal.ok === true && formal.decision === 'ALLOW' && asRecord(formal.makk8, 'makk8').status === 'SAT';

      if (!formalAllowed) {
        return jsonToolResult({
          decision: 'BLOCK',
          stage: 'MAKK8_Z3',
          executed: false,
          formal,
          boundary: 'No local execution is authorized from this result.',
        });
      }

      const gate = await postDecision('/api/dsg/agent-command-gate', gateRequest);
      const gateResult = asRecord(gate.result, 'result');
      const allowed = gate.ok === true && gateResult.canAgentExecute === true && gateResult.decision === 'PASS' && Boolean(gateResult.actionEnvelope);

      return jsonToolResult({
        decision: allowed ? 'ALLOW' : 'BLOCK',
        stage: allowed ? 'DSG_ONE_GATE_PASS' : 'DSG_ONE_GATE',
        executed: false,
        formal,
        gate,
        actionEnvelope: allowed ? gateResult.actionEnvelope : null,
        boundary: allowed
          ? 'Verification passed. The Unify desktop process may execute only the action envelope scope, then must return observed result evidence.'
          : 'DSG ONE did not authorize local execution.',
      });
    }

    if (name === 'unify_record_result') {
      const result = asRecord(args.result, 'result');
      const receipt = await postDecision('/api/dsg/agent-command-gate/result', result);
      return jsonToolResult(receipt);
    }

    if (name === 'unify_replay_evidence') {
      const evidence = asRecord(args.evidence, 'evidence');
      const formalContext = asRecord(args.formalContext, 'formalContext');
      const claimedEvidenceHash = stringValue(evidence.evidenceHash);
      const claimedProofHash = stringValue(evidence.formalProofHash);
      const unsignedEvidence = { ...evidence };
      delete unsignedEvidence.evidenceHash;
      const calculatedEvidenceHash = sha256(unsignedEvidence);
      const integrityMatch = Boolean(claimedEvidenceHash) && calculatedEvidenceHash === claimedEvidenceHash;

      if (!integrityMatch) {
        return jsonToolResult({
          ok: false,
          reason: 'EVIDENCE_HASH_MISMATCH',
          integrityMatch: false,
          formalProofMatch: false,
          calculatedEvidenceHash,
        }, true);
      }

      const formal = await postDecision('/api/dsg/makk8-z3/verify', { context: formalContext });
      const makk8 = asRecord(formal.makk8, 'makk8');
      const formalAllowed = formal.ok === true && makk8.status === 'SAT';
      const formalProofMatch = formalAllowed && stringValue(makk8.proofHash) === claimedProofHash;

      return jsonToolResult({
        ok: formalProofMatch,
        reason: formalProofMatch ? 'REPLAY_VERIFIED' : formalAllowed ? 'FORMAL_PROOF_MISMATCH' : 'FORMAL_REPLAY_BLOCKED',
        integrityMatch: true,
        formalProofMatch,
        formal,
      }, !formalProofMatch);
    }

    if (name === 'unify_chain_status') {
      return jsonToolResult({
        chain: [
          'Unify Desktop Assistant intent',
          'Makk-8 invariants',
          'Z3 SAT/UNSAT verification',
          'DSG ONE agent command gate',
          'ALLOW/BLOCK',
          'Desktop/Browser/Shell execution by local Unify executor only when ALLOW',
          'Local SHA-256 evidence',
          'Agent result receipt',
          'Replay of evidence integrity + formal proof',
          'Trinity MCP inspection/control surface',
        ],
        executionBoundary: 'Trinity MCP and DSG ONE verify/authorize; the local Unify executor performs OS/browser/shell actions.',
      });
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function postDecision(path: string, body: unknown): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (DSG_ONE_TOKEN) headers.Authorization = `Bearer ${DSG_ONE_TOKEN}`;

  const response = await fetch(`${DSG_ONE_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`DSG ONE returned non-JSON from ${path}: HTTP ${response.status}`);
  }

  // 409 is the intentional decision status for a BLOCK result.
  if (!response.ok && response.status !== 409 && response.status !== 422) {
    throw new Error(`DSG ONE request failed ${path}: HTTP ${response.status}`);
  }
  return payload;
}

function jsonToolResult(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2), mimeType: 'application/json' }],
    ...(isError ? { isError: true } : {}),
  };
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Trinity Unify DSG MCP] Connected to ${DSG_ONE_API_URL}`);
}

main().catch((error) => {
  console.error('[Trinity Unify DSG MCP] Fatal:', error);
  process.exit(1);
});
