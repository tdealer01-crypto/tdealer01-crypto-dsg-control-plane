# Gateway Production Benchmark Evidence

This benchmark verifies the public DSG Gateway production flow end-to-end.

## Command

```bash
npm run benchmark:gateway
```

Optional overrides:

```bash
GATEWAY_BENCHMARK_BASE_URL=https://your-host.example.com \
GATEWAY_BENCHMARK_ORG_ID=org-smoke \
GATEWAY_BENCHMARK_CONNECTOR_ENDPOINT=https://your-host.example.com/api/gateway/webhook/inbox \
npm run benchmark:gateway
```

## Verified surfaces

The runner checks:

1. Connector registration
2. Gateway custom HTTP execution
3. Monitor Mode plan check
4. Monitor Mode audit commit
5. Audit events API
6. Audit export API
7. Request hash presence
8. Record hash presence

## Outputs

```text
artifacts/gateway-benchmark/gateway-benchmark-result.json
artifacts/gateway-benchmark/gateway-benchmark-report.md
```

## PASS criteria

The run passes only if all core steps return HTTP 2xx and expected proof fields exist:

- connector saved
- tool saved
- gateway execute returns `ok: true`
- provider result returns `ok: true`
- monitor plan-check returns `decision: allow`
- audit token is returned
- audit commit returns `committed: true`
- audit events returns at least one event
- audit export returns at least one event
- request hashes are present
- record hashes are present

## Evidence boundary

This benchmark is an internal production evidence runner. It proves that the deployed DSG Gateway endpoints can execute the public control flow. It is not an independent third-party certification.
