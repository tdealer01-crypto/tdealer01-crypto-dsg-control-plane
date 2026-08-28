# DSG ONE Azure Deployment Proof

- Captured UTC: 20260828T015648Z
- Result: PASS
- Azure resource group: rg-t.dealer01-0468
- Azure app: dsg-control-plane
- URL: https://dsg-control-plane.azurewebsites.net
- Health HTTP: 200
- Readiness HTTP: 200
- GitHub main SHA: 011cf0b60f85adf273908aa71b929549a18d9c07
- Active container image: DOCKER|dsgcp50aaef839.azurecr.io/dsg-control-plane:011cf0b60f85

## Verification

Health:
```json
{
  "ok": true,
  "service": "dsg-control-plane",
  "timestamp": "2026-08-28T01:57:05.201Z",
  "core_ok": true,
  "db_ok": true,
  "error": null,
  "rateLimiter": {
    "ok": true,
    "detail": "distributed rate limiter configured; health endpoint does not consume limiter bucket"
  },
  "core": {
    "ok": true,
    "status": "ok",
    "version": "internal-runtime-gate",
    "timestamp": "2026-08-28T01:57:04.494Z",
    "error": null
  },
  "readiness": {
    "ok": true,
    "checks": {
      "env": {
        "ok": true
      },
      "nextAuthSecret": {
        "ok": true
      },
      "supabaseServiceRole": {
        "ok": true
      },
      "dsgCoreConfig": {
        "ok": true
      },
      "dsgCoreHealth": {
        "ok": true
      },
      "financeGovernanceSurface": {
        "ok": true
      },
      "financeGovernanceBackend": {
        "ok": true
      }
    },
    "timestamp": "2026-08-28T01:57:05.201Z"
  }
}
```

Readiness:
```json
{
  "ok": true,
  "checks": {
    "env": {
      "ok": true
    },
    "nextAuthSecret": {
      "ok": true
    },
    "supabaseServiceRole": {
      "ok": true
    },
    "dsgCoreConfig": {
      "ok": true
    },
    "dsgCoreHealth": {
      "ok": true
    },
    "financeGovernanceSurface": {
      "ok": true
    },
    "financeGovernanceBackend": {
      "ok": true
    }
  },
  "timestamp": "2026-08-28T01:57:06.821Z"
}
```
