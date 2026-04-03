export function internalErrorMessage() {
  return 'Internal server error';
}

export function logApiError(route: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${route}]`, {
    error,
    ...(details || {}),
  });
}
