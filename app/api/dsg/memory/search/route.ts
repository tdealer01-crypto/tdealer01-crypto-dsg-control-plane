import { getGovernedMemoryRequestContext, requireMemoryPermission } from '../../../../../lib/dsg/memory/request-context';
import { searchMemoryEvents } from '../../../../../lib/dsg/memory/memory-repository';
import {
  errorStatus,
  jsonFail,
  jsonOk,
  optionalString,
  safeErrorCode,
} from '../../../../../lib/dsg/memory/route-utils';
import type { MemoryKind, MemoryStatus } from '../../../../../lib/dsg/memory/types';

export const dynamic = 'force-dynamic';

function csv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export async function GET(request: Request) {
  try {
    const context = getGovernedMemoryRequestContext(request);
    requireMemoryPermission(context, 'memory:read');

    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get('limit') ?? '20');
    const limit = Number.isFinite(limitValue) ? limitValue : 20;

    const memories = await searchMemoryEvents(context, {
      jobId: optionalString(url.searchParams.get('jobId')),
      query: optionalString(url.searchParams.get('q')),
      memoryKinds: csv(url.searchParams.get('memoryKinds')) as MemoryKind[] | undefined,
      statuses: csv(url.searchParams.get('statuses')) as MemoryStatus[] | undefined,
      limit,
    });

    return jsonOk({ memories, count: memories.length });
  } catch (error) {
    return jsonFail(safeErrorCode(error), errorStatus(error));
  }
}
