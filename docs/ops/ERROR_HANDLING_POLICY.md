# Error Handling Policy

## Goal
Centralize and standardize server error-to-client mapping to avoid leaking internal details.

## Requirements
1. All server routes under `app/api/*/route.ts` must use `handleApiError(route, err)` (or a wrapper such as `withApiErrorHandling(handler)`).
2. Route handlers must not return internal DB/third-party error messages directly to clients (for example `error.message`).
3. CI enforces no direct `error.message` leakage via `scripts/check-error-handlers.sh` (hard fail).
4. Routes not yet using centralized helpers are reported as warnings during migration and should be migrated to `handleApiError(route, err)`.

## Example
```ts
import { handleApiError } from '../../../lib/security/api-error';

export async function GET(req: Request) {
  try {
    // handler logic...
  } catch (err) {
    return handleApiError('api/example', err);
  }
}
```

## Exceptions

If a route intentionally uses a different centralized helper, add comment marker:

```ts
// ERROR_HANDLER_EXEMPT: uses wrapper helper with equivalent safety guarantees
```

and include a short justification in the PR description.

## Rationale

* Prevents information leakage.
* Keeps client-facing messages consistent and safe.
* Simplifies auditing and ensures compliance with security-go-live requirements.
