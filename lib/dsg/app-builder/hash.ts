import { createHash } from 'crypto';
import { stableAppBuilderJson } from './stable-json';

export function hashAppBuilderObject(value: unknown): string {
  return createHash('sha256')
    .update(stableAppBuilderJson(value))
    .digest('hex');
}
