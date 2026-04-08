import { executeBrowserbaseAction } from './browserbase';
import { executeSocialAction } from './social';
import type { ExecutorDispatchParams, ExecutorDispatchResult } from './types';

export async function dispatchExecutor(
  params: ExecutorDispatchParams,
): Promise<ExecutorDispatchResult> {
  if (params.action.startsWith('browser.')) {
    return executeBrowserbaseAction(params);
  }

  if (params.action.startsWith('social.')) {
    return executeSocialAction(params);
  }

  throw new Error(`No executor registered for action: ${params.action}`);
}
