import { loadExternalAgentContext } from '@/lib/dsg/agent-runtime/external-context-tools';
import { sha256Json } from '@/lib/dsg/runtime/hash';

export type SeedDataType =
  | 'codebase_state'
  | 'ci_status'
  | 'test_coverage'
  | 'deployment_status'
  | 'external_api'
  | 'github_search'
  | 'browser_content';

export interface SeedRequest {
  dataType: SeedDataType;
  query: string;
  requiredEvidence: boolean;
  /**
   * Context is query context only. It is never accepted as evidence and is
   * never hashed into a PASS result. A caller cannot self-certify its input.
   */
  context?: string;
}

export interface SeedResult {
  ok: boolean;
  dataType: SeedDataType;
  query: string;
  data: unknown;
  evidenceHash: string;
  sourceUrl: string;
  gateStatus: 'PASS' | 'BLOCK';
  blockReason?: string;
  searchAttempted: boolean;
}

const EXTERNAL_CONTEXT_TYPES = new Set<SeedDataType>(['github_search', 'external_api']);

/**
 * Seed Engine accepts evidence only from a configured external connector.
 * Caller-supplied JSON is never promoted to verified data.
 */
export async function seedData(request: SeedRequest): Promise<SeedResult> {
  const { dataType, query, requiredEvidence, context } = request;

  if (!EXTERNAL_CONTEXT_TYPES.has(dataType)) {
    return failedSeed(
      dataType,
      query,
      `NO_VERIFIED_FETCHER_FOR_${dataType.toUpperCase()}${context ? ':CALLER_CONTEXT_REJECTED' : ''}`,
      requiredEvidence,
      false,
    );
  }

  try {
    const externalQuery = context ? `${query}\nContext: ${context}` : query;
    const { items } = await loadExternalAgentContext(externalQuery);
    const used = items.find((item) => item.status === 'used' && item.data !== undefined);

    if (!used) {
      return failedSeed(
        dataType,
        query,
        dataType === 'github_search' ? 'SEARCH_RETURNED_NO_RESULTS' : 'EXTERNAL_CONTEXT_UNAVAILABLE',
        requiredEvidence,
        true,
      );
    }

    const sourceUrl = used.sourceUrl ?? '';
    if (!sourceUrl) {
      return failedSeed(dataType, query, 'EXTERNAL_SOURCE_URL_MISSING', requiredEvidence, true);
    }

    const data = used.data;
    const evidenceHash = sha256Json({
      dataType,
      query,
      data,
      sourceUrl,
      connectorEvidence: used.evidence ?? [],
    });

    return {
      ok: true,
      dataType,
      query,
      data,
      evidenceHash,
      sourceUrl,
      gateStatus: 'PASS',
      searchAttempted: true,
    };
  } catch (err) {
    return failedSeed(dataType, query, String(err), requiredEvidence, true);
  }
}

function failedSeed(
  dataType: SeedDataType,
  query: string,
  reason: string,
  block: boolean,
  searchAttempted: boolean,
): SeedResult {
  return {
    ok: false,
    dataType,
    query,
    data: null,
    evidenceHash: 'sha256:none',
    sourceUrl: '',
    gateStatus: block ? 'BLOCK' : 'PASS',
    blockReason: reason,
    searchAttempted,
  };
}

export function assertSeedPass(results: SeedResult[]): void {
  const blocked = results.filter((result) => result.gateStatus === 'BLOCK');
  if (blocked.length > 0) {
    const reasons = blocked.map((result) => `${result.dataType}:${result.blockReason}`).join(', ');
    throw new Error(`SEED_ENGINE_BLOCK: ${reasons}`);
  }
}
