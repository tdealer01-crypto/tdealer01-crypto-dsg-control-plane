# release-gate CLI

Run a deterministic GO/NO-GO production check against a deployed URL.

## Usage

```bash
npx @tdealer01/release-gate https://your-app.com
```

## What it checks

- health endpoint
- readiness endpoint
- monitor status
- user-flow (Playwright live test)
- audit evidence completeness
- legacy API usage

## Output

```bash
✅ RELEASE: GO
or
❌ RELEASE: NO-GO
```

## Requirements

- Node 18+
- bash (for go-no-go script)
- playwright (installed in project)

## Local dev

```bash
node ./bin/release-gate.mjs http://localhost:3000
```

## Publish

```bash
cd tools/release-gate
npm login
npm publish --access public
```
