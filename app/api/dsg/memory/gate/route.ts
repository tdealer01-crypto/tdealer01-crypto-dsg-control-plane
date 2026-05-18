import { getGovernedMemoryRequestContext, requireMemoryPermission } from '../../../../../lib/dsg/memory/request-context';
import { gateMemoryEvents } from '../../../../../lib/dsg/memory/memory-repository';
import {
  asRecord,
  errorStatus,
  jsonFail,
  jsonOk,
  optionalString,
  parseBodyMemories,
  parseScope,
  safeErrorCode,
} from '../../../../../lib/dsg/memory/route-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const context = getGovernedMemoryRequestContext(request);
    requireMemoryPermission(context, 'memory:gate');
    requireMemoryPermission(context, 'memory:read');

    const body = asRecord(await request.json().catch(() => null));
    const memories = parseBodyMemories(body.memories);

    if (memories.length === 0) {
      return jsonFail('MEMORIES_REQUIRED', 400);
    }

    const scope = parseScope(context, body.scope, 'planning');
    const result = await gateMemoryEvents({
      context,
      memories,
      scope,
      queryText: optionalString(body.queryText) ?? 'memory-gate',
    });

    return jsonOk({ gate: result });
  } catch (error) {
    return jsonFail(safeErrorCode(error), errorStatus(error));
  }
}
