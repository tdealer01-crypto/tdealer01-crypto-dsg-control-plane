export function resolveOrgId(request: Request): string {
  const header = request.headers.get('x-org-id')?.trim();
  if (!header) {
    throw new Error('missing_org_id');
  }
  return header;
}
