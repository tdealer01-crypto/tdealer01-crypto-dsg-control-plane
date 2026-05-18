import { getGovernedMemoryRequestContext, requireMemoryPermission } from '../../../../../lib/dsg/memory/request-context';
import { ingestMemoryEvent } from '../../../../../lib/dsg/memory/memory-repository';
import {
  asRecord,
  errorStatus,
  jsonFail,
  jsonOk,
  optionalString,
  safeErrorCode,
} from '../../../../../lib/dsg/memory/route-utils';
import type { MemoryKind, MemorySourceType, MemoryStatus, MemoryTrustLevel } from '../../../../../lib/dsg/memory/types';

export const dynamic = 'force-dynamic';

type IngestBody = {
  jobId?: string;
  sourceType?: MemorySourceType;
  memoryKind?: MemoryKind;
  rawText?: string;
  normalizedSummary?: string;
  trustLevel?: MemoryTrustLevel;
  status?: MemoryStatus;
  containsSecret?: boolean;
  containsPii?: boolean;
  containsLegalClaim?: boolean;
  containsProductionClaim?: boolean;
  sourceEvidenceId?: string;
  sourceAuditId?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
};

function parseIngestBody(value: unknown): IngestBody {
  const body = asRecord(value);
  return {
    jobId: optionalString(body.jobId),
    sourceType: optionalString(body.sourceType) as MemorySourceType | undefined,
    memoryKind: optionalString(body.memoryKind) as MemoryKind | undefined,
    rawText: optionalString(body.rawText),
    normalizedSummary: optionalString(body.normalizedSummary),
    trustLevel: optionalString(body.trustLevel) as MemoryTrustLevel | undefined,
    status: optionalString(body.status) as MemoryStatus | undefined,
    containsSecret: body.containsSecret === true,
    containsPii: body.containsPii === true,
    containsLegalClaim: body.containsLegalClaim === true,
    containsProductionClaim: body.containsProductionClaim === true,
    sourceEvidenceId: optionalString(body.sourceEvidenceId),
    sourceAuditId: optionalString(body.sourceAuditId),
    contentHash: optionalString(body.contentHash),
    metadata: asRecord(body.metadata),
  };
}

export async function POST(request: Request) {
  try {
    const context = getGovernedMemoryRequestContext(request);
    requireMemoryPermission(context, 'memory:write');

    const body = parseIngestBody(await request.json().catch(() => null));

    if (!body.rawText) {
      return jsonFail('MEMORY_RAW_TEXT_REQUIRED', 400);
    }

    if (!body.contentHash) {
      return jsonFail('MEMORY_CONTENT_HASH_REQUIRED', 400);
    }

    if (!body.sourceType || !body.memoryKind) {
      return jsonFail('MEMORY_SOURCE_TYPE_AND_KIND_REQUIRED', 400);
    }

    const memory = await ingestMemoryEvent(context, {
      jobId: body.jobId,
      sourceType: body.sourceType,
      memoryKind: body.memoryKind,
      rawText: body.rawText,
      normalizedSummary: body.normalizedSummary,
      trustLevel: body.trustLevel,
      status: body.status,
      containsSecret: body.containsSecret,
      containsPii: body.containsPii,
      containsLegalClaim: body.containsLegalClaim,
      containsProductionClaim: body.containsProductionClaim,
      sourceEvidenceId: body.sourceEvidenceId,
      sourceAuditId: body.sourceAuditId,
      contentHash: body.contentHash,
      metadata: body.metadata,
    });

    return jsonOk({ memory }, 201);
  } catch (error) {
    return jsonFail(safeErrorCode(error), errorStatus(error));
  }
}
