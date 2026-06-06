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

// Z3 invariant enforced at runtime:
// data_needed ∧ data_unknown → must_search ∧ ¬can_proceed_without_search
// If search fails and requiredEvidence=true → always BLOCK, never return guessed data.
export async function seedData(request: SeedRequest): Promise<SeedResult> {
  const { dataType, query, requiredEvidence, context } = request;

  let data: unknown = null;
  let sourceUrl = '';
  let searchAttempted = false;

  try {
    searchAttempted = true;

    if (dataType === 'github_search') {
      const { items } = await loadExternalAgentContext(query);
      const used = items.find((i) => i.status === 'used');
      if (!used) {
        if (requiredEvidence) {
          return failedSeed(dataType, query, 'SEARCH_RETURNED_NO_RESULTS', true);
        }
        return failedSeed(dataType, query, 'SEARCH_RETURNED_NO_RESULTS', false);
      }
      data = used.data;
      sourceUrl = used.sourceUrl ?? '';
    } else if (dataType === 'external_api') {
      const { items } = await loadExternalAgentContext(query);
      const used = items.find((i) => i.status === 'used');
      if (!used) {
        return failedSeed(dataType, query, 'EXTERNAL_CONTEXT_UNAVAILABLE', requiredEvidence);
      }
      data = used.data;
      sourceUrl = used.sourceUrl ?? '';
    } else {
      // For codebase_state, ci_status, test_coverage, deployment_status, browser_content:
      // callers must inject data via their own fetcher — seed engine wraps with evidence
      // This path is for pre-fetched data passed as context JSON
      if (context) {
        try {
          data = JSON.parse(context);
          sourceUrl = `internal:${dataType}`;
        } catch {
          return failedSeed(dataType, query, 'CONTEXT_PARSE_FAILED', requiredEvidence);
        }
      } else if (requiredEvidence) {
        return failedSeed(dataType, query, 'NO_DATA_AND_NO_SEARCH_PATH', true);
      } else {
        return failedSeed(dataType, query, 'NO_DATA_SOURCE_CONFIGURED', false);
      }
    }

    if (data === null || data === undefined) {
      return failedSeed(dataType, query, 'SEARCH_RETURNED_EMPTY_DATA', requiredEvidence);
    }

    const evidenceHash = sha256Json({ dataType, query, data, sourceUrl });

    return {
      ok: true,
      dataType,
      query,
      data,
      evidenceHash,
      sourceUrl,
      gateStatus: 'PASS',
      searchAttempted,
    };
  } catch (err) {
    return failedSeed(dataType, query, String(err), requiredEvidence);
  }
}

function failedSeed(
  dataType: SeedDataType,
  query: string,
  reason: string,
  block: boolean,
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
    searchAttempted: true,
  };
}

export function assertSeedPass(results: SeedResult[]): void {
  const blocked = results.filter((r) => r.gateStatus === 'BLOCK');
  if (blocked.length > 0) {
    const reasons = blocked.map((r) => `${r.dataType}:${r.blockReason}`).join(', ');
    throw new Error(`SEED_ENGINE_BLOCK: ${reasons}`);
  }
}
