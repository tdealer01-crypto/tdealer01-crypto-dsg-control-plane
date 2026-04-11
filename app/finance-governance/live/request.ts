const DEMO_ORG_ID = 'org-demo-live';

export function financeGovernanceFetch(input: string | URL | globalThis.Request, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-org-id', DEMO_ORG_ID);

  return fetch(input, {
    ...init,
    headers,
  });
}
