type ErrorLike = {
  message?: string | null;
  code?: string | null;
};

export function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as ErrorLike;
  const message = String(candidate.message || '');
  const code = String(candidate.code || '');

  return (
    code === '42P01' ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  );
}
