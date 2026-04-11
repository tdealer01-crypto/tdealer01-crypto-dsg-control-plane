const DEMO_ORG_ID = 'org-demo-live';
const DEMO_ORG_STORAGE_KEY = 'finance-governance-demo-org-id';

function resolveOrgId() {
  if (typeof window === 'undefined') {
    return DEMO_ORG_ID;
  }

  const overrideOrgId = window.localStorage.getItem(DEMO_ORG_STORAGE_KEY)?.trim();
  if (overrideOrgId) {
    return overrideOrgId;
  }

  return DEMO_ORG_ID;
}

export function financeGovernanceFetch(input: string | URL | globalThis.Request, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-org-id', resolveOrgId());

  return fetch(input, {
    ...init,
    headers,
  });
}
