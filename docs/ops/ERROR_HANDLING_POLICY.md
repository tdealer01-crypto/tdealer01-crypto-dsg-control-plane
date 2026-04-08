# Error Handling Policy

## Goal
Centralize and standardize server error-to-client mapping to avoid leaking internal details.

## Requirements
1. All server routes under `app/api/*/route.ts` must use `handleApiError(err)` (or a wrapper `withApiErrorHandling(handler)`).
2. Route handlers must not return internal DB/third-party error messages directly to clients.
3. CI will enforce requirement via `scripts/check-error-handlers.sh`. Violations will fail CI.

## Example
```ts
import { handleApiError } from "lib/security/error-response";

export async function GET(req: Request) {
  try {
    // handler logic...
  } catch (err) {
    return handleApiError(err);
  }
}
```

## Exceptions

If a route intentionally uses a different centralized helper, add a comment marker `// ERROR_HANDLER_EXEMPT` and a short justification. The CI script can be extended to recognize exemptions if necessary.

## Rationale

* Prevents information leakage.
* Keeps client-facing messages consistent and safe.
* Simplifies auditing and ensures compliance with security-go-live requirements.
