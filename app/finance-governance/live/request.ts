const ORG_STORAGE_KEY = 'finance-governance-org-id';

function resolveOrgId() {
  if (typeof window === 'undefined') {
    return '';
  }

  const overrideOrgId = window.localStorage.getItem(ORG_STORAGE_KEY)?.trim();
  if (overrideOrgId) {
    return overrideOrgId;
  }

  const htmlOrgId = document.documentElement.getAttribute('data-org-id')?.trim();
  return htmlOrgId || '';
}

export function financeGovernanceFetch(input: string | URL | globalThis.Request, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const orgId = resolveOrgId();
  if (orgId) {
    headers.set('x-org-id', orgId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
