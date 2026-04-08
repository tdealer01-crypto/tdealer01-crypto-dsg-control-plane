export type SafeErrorInfo = {
  name: string;
  code: string | null;
};

export function toSafeErrorInfo(error: unknown): SafeErrorInfo {
  if (!error || typeof error !== 'object') {
    return { name: 'UnknownError', code: null };
  }

  const typed = error as { name?: unknown; code?: unknown };

  return {
    name: typeof typed.name === 'string' && typed.name.trim() ? typed.name : 'Error',
    code: typeof typed.code === 'string' && typed.code.trim() ? typed.code : null,
  };
}

export function logSecurityEvent(level: 'info' | 'warn' | 'error', event: string, details?: Record<string, unknown>) {
  const payload = details ? { event, ...details } : { event };

  if (level === 'info') {
    console.info(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.error(payload);
}
