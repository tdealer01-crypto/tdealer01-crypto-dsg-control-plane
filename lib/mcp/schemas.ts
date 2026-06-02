export const DSG_TOOL_SCHEMAS = {
  'dsg.evaluate': {
    description:
      'Evaluate an AI agent action through the DSG deterministic gate. Returns gate decision (PASS/BLOCK/REVIEW), proof hash, and policy constraints checked.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action identifier the agent wants to perform (e.g. "deploy.production", "finance.approve")',
        },
        actor: {
          type: 'string',
          description: 'Actor identifier (user, agent, or service performing the action)',
        },
        tool: {
          type: 'string',
          description: 'Tool or system the action targets',
        },
        args: {
          type: 'object',
          description: 'Action arguments as key-value context passed to the gate',
          additionalProperties: true,
        },
        env: {
          type: 'object',
          description: 'Environment context: riskLevel (low|medium|high|critical), planId, policyRef',
          properties: {
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            planId: { type: 'string' },
            policyRef: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
      required: ['action', 'actor'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        gateStatus: { type: 'string', enum: ['PASS', 'BLOCK', 'REVIEW'] },
        proofStatus: { type: 'string', enum: ['PASS', 'BLOCK', 'REVIEW', 'UNSUPPORTED'] },
        riskLevel: { type: 'string' },
        reason: { type: ['string', 'null'] },
        proofHash: { type: 'string' },
        proofId: { type: 'string' },
        boundary: { type: 'object' },
      },
      required: ['gateStatus', 'proofStatus', 'riskLevel', 'proofHash'],
    },
  },

  'dsg.verifyClaim': {
    description:
      'Verify whether a production claim is allowed given the current evidence state. Blocks claims like "production-ready" or "certified" that require independent verification.',
    inputSchema: {
      type: 'object',
      properties: {
        claim: {
          type: 'string',
          description: 'The claim string to verify (e.g. "production-ready", "audit-ready")',
        },
        evidenceRefs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Evidence reference IDs or hashes that support this claim',
        },
      },
      required: ['claim'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        status: { type: 'string', enum: ['allowed', 'blocked', 'requires-evidence'] },
        reason: { type: 'string' },
        claimBoundary: { type: 'string' },
      },
      required: ['allowed', 'status', 'reason'],
    },
  },

  'dsg.recordEvidence': {
    description:
      'Record an evidence envelope into the CCVS chain. Returns an evidence envelope with integrity hash.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['unit', 'integration', 'adversarial', 'replay', 'oversight', 'sbom', 'provenance', 'mutation'],
          description: 'Evidence type (L1=unit through L5=provenance)',
        },
        hash: {
          type: 'string',
          description: 'SHA-256 hash of the evidence artifact',
        },
        url: {
          type: 'string',
          description: 'URL or path reference to the evidence artifact',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata: testCount, passCount, coveragePercent, etc.',
          additionalProperties: true,
        },
      },
      required: ['kind', 'hash'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        envelopeId: { type: 'string' },
        integrityHash: { type: 'string' },
        severityLevel: { type: 'number' },
        schema_version: { type: 'string' },
      },
      required: ['envelopeId', 'integrityHash', 'severityLevel'],
    },
  },

  'dsg.exportComplianceBundle': {
    description:
      'Export a compliance bundle for a given regulatory framework. Returns the compliance matrix with control statuses and summary.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['EU AI Act', 'ISO 42001', 'all'],
          description: 'Framework to export (EU AI Act, ISO 42001, or all)',
        },
      },
      required: ['framework'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        schema_version: { type: 'string' },
        generated_at: { type: 'string' },
        policy_version: { type: 'string' },
        framework: { type: 'string' },
        rows: { type: 'array' },
        summary: { type: 'object' },
        boundary: { type: 'object' },
      },
      required: ['schema_version', 'generated_at', 'rows', 'summary'],
    },
  },

  'dsg.getReadiness': {
    description:
      'Get the current DSG system readiness status including compliance matrix summary, evidence chain health, and deployment posture.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        readinessLevel: { type: 'string', enum: ['GO', 'NO-GO', 'PENDING'] },
        complianceSummary: { type: 'object' },
        evidenceChainHealthy: { type: 'boolean' },
        timestamp: { type: 'string' },
      },
      required: ['ok', 'readinessLevel'],
    },
  },
} as const;

export type DsgToolName = keyof typeof DSG_TOOL_SCHEMAS;
export const DSG_TOOL_NAMES = Object.keys(DSG_TOOL_SCHEMAS) as DsgToolName[];
