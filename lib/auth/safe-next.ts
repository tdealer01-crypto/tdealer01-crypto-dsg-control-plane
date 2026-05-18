const DEFAULT_NEXT_PATH = '/dashboard/executions';

export function getSafeNext(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value[1] === '\\'
  ) {
    return DEFAULT_NEXT_PATH;
  }
  return value;
}
