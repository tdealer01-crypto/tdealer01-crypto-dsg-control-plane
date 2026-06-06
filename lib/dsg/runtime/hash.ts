import { createHash } from 'node:crypto';
import { stableJsonStringify } from './stable-json';

export function sha256Text(input: string): string {
  return `sha256:${createHash('sha256').update(input, 'utf8').digest('hex')}`;
}

export function sha256Json(input: unknown): string {
  return sha256Text(stableJsonStringify(input));
}

export function assertHash(value: string): void {
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`Invalid DSG hash: ${value}`);
  }
}
