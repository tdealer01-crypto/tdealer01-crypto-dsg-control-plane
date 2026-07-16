# Publishing @dsg-one/sdk to npm

This guide explains how to publish the DSG ONE SDK to the npm registry.

## Prerequisites

- **npm account** with publish permissions for the `@dsg-one` namespace
- **npm authentication token** (from `npm login` or `~/.npmrc`)
- **Recent build**: Run `npm run build` to ensure `dist/` is up to date
- **Commit all changes**: Changes should be committed to git before publishing

## Publishing Steps

### 1. Verify the build

```bash
cd packages/dsg-one-sdk
npm run build
```

Confirm that `dist/` contains `.js` and `.d.ts` files.

### 2. Verify package contents

```bash
npm pack --dry-run
```

This shows exactly what will be published:
- `dist/` folder with compiled output
- `README.md`
- `LICENSE`
- `package.json`

**Important**: Ensure no source files (`.ts`), secrets, or node_modules are included.

### 3. Update version (if needed)

For a new release, bump the version in `package.json`:

```bash
npm version patch    # 0.1.0 → 0.1.1
npm version minor    # 0.1.0 → 0.2.0
npm version major    # 0.1.0 → 1.0.0
```

Or manually edit `"version"` in `package.json`.

### 4. Publish to npm

```bash
npm publish
```

This command:
- Validates `package.json`
- Runs `prepublishOnly` script (which runs `npm run build`)
- Uploads tarball to npm registry
- Makes package public (via `publishConfig.access = "public"`)

### 5. Verify on npm

After successful publish:

```bash
# Check npm registry
npm view @dsg-one/sdk

# Install from npm
npm install @dsg-one/sdk
```

## Authentication

If you haven't logged in:

```bash
npm login
# Enter: username, password, and OTP (if 2FA enabled)
```

Your token is saved to `~/.npmrc`.

## Scoped Package Notes

- Package name: `@dsg-one/sdk`
- Scope: `dsg-one`
- Access: `public` (configured in `publishConfig`)
- URL after publish: https://www.npmjs.com/package/@dsg-one/sdk

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `403 Forbidden` | Not logged in, or insufficient permissions for scope |
| `404 Not Found` | Scope `@dsg-one` doesn't exist yet (create on npmjs.com) |
| `EEXIST: file already exists` | Version already published; bump version |
| Build fails | Run `npm run build` manually to see errors |

## One-Command Publish (for CI/CD)

```bash
cd packages/dsg-one-sdk && npm publish
```

In GitHub Actions or similar CI, use:

```yaml
- run: cd packages/dsg-one-sdk && npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- `PATCH` (0.1.1): Bug fixes, docs, no API changes
- `MINOR` (0.2.0): New features, backward compatible
- `MAJOR` (1.0.0): Breaking changes

Current version: **0.1.0** (pre-release)

## Reference

- [npm publish documentation](https://docs.npmjs.com/cli/v20/commands/npm-publish)
- [Scoped packages guide](https://docs.npmjs.com/about/scoped-packages)
- [Publishing to npm](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
