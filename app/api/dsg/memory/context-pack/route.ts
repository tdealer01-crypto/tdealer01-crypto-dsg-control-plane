import { getGovernedMemoryRequestContext, requireMemoryPermission } from '../../../../../lib/dsg/memory/request-context';
import { createMemoryContextPack } from '../../../../../lib/dsg/memory/memory-repository';
import {
  asRecord,
  errorStatus,
  jsonFail,
  jsonOk,
  parseBodyMemories,
  parseScope,
  safeErrorCode,
  stringArray,
} from '../../../../../lib/dsg/memory/route-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const context = getGovernedMemoryRequestContext(request);
    requireMemoryPermission(context, 'memory:context_pack');
    requireMemoryPermission(context, 'memory:read');

    const body = asRecord(await request.json().catch(() => null));
    const memories = parseBodyMemories(body.memories);

    if (memories.length === 0) {
      return jsonFail('MEMORIES_REQUIRED', 400);
    }

    const scope = parseScope(context, body.scope, 'planning');
    const contextPack = await createMemoryContextPack(context, {
      memories,
      scope,
      evidenceIds: stringArray(body.evidenceIds),
      auditIds: stringArray(body.auditIds),
    });

    return jsonOk({ contextPack }, 201);
  } catch (error) {
    return jsonFail(safeErrorCode(error), errorStatus(error));
  }
}
