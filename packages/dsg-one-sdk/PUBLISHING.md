# Publishing @dsg-one/sdk to npm

This guide defines the canonical release path for the DSG ONE SDK.

## Canonical release path

Production npm releases use **GitHub Actions + npm Trusted Publishing (OIDC)** through:

- Repository: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Workflow: `.github/workflows/publish-dsg-one-sdk.yml`
- Runner: GitHub-hosted `ubuntu-latest`
- Node.js: 24
- Authentication: OIDC (`id-token: write`)
- Long-lived npm publish token: **not used**

Do not recreate expired write tokens such as `tar` or `dsg` for this CI publish path.

## One-time npm configuration

Trusted Publishing is configured on npmjs.com for the package, not in GitHub Secrets.

Open the package settings and add a GitHub Actions trusted publisher with these exact values:

| Field | Value |
|---|---|
| Organization or user | `tdealer01-crypto` |
| Repository | `tdealer01-crypto-dsg-control-plane` |
| Workflow filename | `publish-dsg-one-sdk.yml` |
| Allowed action | `npm publish` |
| Environment | Leave empty unless a matching GitHub environment is deliberately added |

The workflow filename is case-sensitive and npm expects only the filename, not `.github/workflows/`.

### First publish bootstrap

npm requires a package to already exist on the registry before a Trusted Publisher can be attached to it.

If `@dsg-one/sdk` has never been published, perform exactly one authenticated maintainer publish first:

```bash
cd packages/dsg-one-sdk
npm install --package-lock=false
npm test
npm run build
npm pack --dry-run
npm login
npm publish --access public
```

Complete the interactive 2FA challenge when npm requests it. After the package exists, configure the Trusted Publisher above and use GitHub Actions for subsequent releases.

Do not create a new long-lived CI write token merely to bootstrap Trusted Publishing.

## Release checks

Before releasing, update `version` in `packages/dsg-one-sdk/package.json` and verify the SDK locally:

```bash
cd packages/dsg-one-sdk
npm install --package-lock=false
npm test
npm run build
npm pack --dry-run
```

The package must include the compiled `dist/`, `README.md`, `LICENSE`, and `package.json`, and must not contain secrets or `node_modules`.

## Publish from GitHub Actions

### Option A — release tag

For package version `X.Y.Z`, create the exact tag:

```text
dsg-one-sdk-vX.Y.Z
```

The workflow blocks publication if the tag version does not match `package.json`.

### Option B — manual dispatch

Run the **Publish DSG ONE SDK** workflow from GitHub Actions and enter:

```text
publish
```

in the confirmation input.

Both paths run the same release gates:

1. Install a supported npm 11 CLI on Node 24.
2. Install SDK dependencies.
3. Run SDK tests.
4. Build TypeScript output.
5. Run `npm pack --dry-run`.
6. Block if the same package version already exists on npm.
7. Publish with OIDC using `npm publish --access public`.

No `NPM_TOKEN` or `NODE_AUTH_TOKEN` is supplied to the publish step.

## Verify the release

After the workflow succeeds:

```bash
npm view @dsg-one/sdk version
npm view @dsg-one/sdk dist-tags
npm install @dsg-one/sdk
```

For releases made through Trusted Publishing from this public GitHub repository, npm generates provenance automatically.

## Private dependency exception

Trusted Publishing authenticates `npm publish`; it does not authenticate installation of private npm dependencies.

The SDK currently declares no runtime dependencies and does not require a private-package token for its release workflow. If private dependencies are added later, create a **read-only granular token** restricted to those dependencies and expose it only to the install step as `NPM_READ_TOKEN`. Never reuse that token for publishing.

## Manual Termux fallback

`npm-publish-termux.sh` is retained only for first-publish bootstrap or emergency manual releases. It uses interactive npm authentication and does not provision a CI write token.

`npm-token-fix-termux.sh` is deprecated as a token-creation helper. It now explains the OIDC migration instead of attempting `npm token create`.

## Failure guide

| Failure | Meaning / action |
|---|---|
| `ENEEDAUTH` / unable to authenticate | Confirm the npm Trusted Publisher fields exactly match this repository and `publish-dsg-one-sdk.yml` |
| OIDC error | Confirm workflow has `id-token: write` and runs on GitHub-hosted runner |
| Package does not exist when configuring trust | Complete the one-time first publish bootstrap, then configure Trusted Publishing |
| Version already exists | Bump `package.json` version; npm versions are immutable |
| Tag/version mismatch | Use `dsg-one-sdk-vX.Y.Z` matching `package.json` exactly |
| Build/test failure | Fix the failing SDK code/test; publishing remains blocked |
| Private dependency install fails | Add a read-only `NPM_READ_TOKEN` only for the install step if genuinely required |

## References

- npm Trusted Publishing: https://docs.npmjs.com/trusted-publishers/
- npm access tokens: https://docs.npmjs.com/creating-and-viewing-access-tokens/
- npm publish: https://docs.npmjs.com/cli/commands/npm-publish
