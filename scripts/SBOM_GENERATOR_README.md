# SBOM Generator Script

Generate Software Bill of Materials (SBOM) in CycloneDX format for supply chain security and evidence collection.

## Location

`scripts/generate-sbom.mjs`

## Features

- **CycloneDX 1.4 Compliant**: Generates SBOMs in the industry-standard CycloneDX format
- **Multiple Output Formats**: JSON (default) and XML output
- **Production/Dev Separation**: Generate SBOMs for production dependencies only (default) or include devDependencies
- **License Extraction**: Automatically extracts license information from package.json and LICENSE files
- **Package URL (pURL)**: Generates standardized package URLs per dependency
- **Integrity Verification**: Includes SHA-256 hash of SBOM content for integrity verification
- **Vulnerability Support**: Optional vulnerability data fetching from npm audit
- **Serial Numbering**: Unique UUID per SBOM for tracking and audit trails

## Usage

### Basic Usage

```bash
# Generate default SBOM (production dependencies, JSON format)
node scripts/generate-sbom.mjs

# Output location: artifacts/bom.cdx.json
```

### With Options

```bash
# Custom output path
node scripts/generate-sbom.mjs --output=/path/to/sbom.json

# XML format
node scripts/generate-sbom.mjs --format=xml

# Include devDependencies
node scripts/generate-sbom.mjs --include-dev

# Include vulnerability data
node scripts/generate-sbom.mjs --include-vulns

# Combine options
node scripts/generate-sbom.mjs \
  --include-dev \
  --format=json \
  --include-vulns \
  --output=artifacts/sbom-full.json
```

### Help

```bash
node scripts/generate-sbom.mjs --help
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output=PATH` | Output file path | `artifacts/bom.cdx.json` |
| `--format=json\|xml` | Output format | `json` |
| `--include-dev` | Include devDependencies | false (production only) |
| `--include-vulns` | Fetch vulnerability data | false |
| `--help` | Show help message | N/A |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid input, file not found, write error) |
| 2 | Vulnerabilities found (critical/high severity) with `--include-vulns` |

## Output Structure

### JSON SBOM (CycloneDX 1.4)

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "serialNumber": "urn:uuid:...",
  "version": 1,
  "metadata": {
    "timestamp": "2026-06-12T04:21:59.840Z",
    "tools": [
      {
        "vendor": "DSG",
        "name": "DSG Evidence Generator",
        "version": "1.0.0"
      }
    ],
    "component": {
      "type": "application",
      "name": "dsg-platform",
      "version": "0.0.0",
      "purl": "pkg:npm/dsg-platform@0.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "ethers",
      "version": "6.16.0",
      "purl": "pkg:npm/ethers@6.16.0",
      "licenses": [
        {
          "expression": "MIT"
        }
      ],
      "homepage": "https://docs.ethers.org/",
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "..."
        }
      ]
    }
  ],
  "vulnerabilities": [
    {
      "ref": "pkg:npm/package@version",
      "id": "CVE-2024-XXXX",
      "severity": "high",
      "description": "...",
      "recommendations": [
        {
          "text": "Upgrade to X.X.X"
        }
      ]
    }
  ],
  "integrity": {
    "alg": "SHA-256",
    "value": "0e418e1418001cbaf50df1c0f39a9e0de773df59f3bbc0d4dcae21e69c58b54e"
  }
}
```

## Key Fields

### bomFormat & specVersion
- CycloneDX format identifier and version (1.4)

### serialNumber
- Unique UUID per SBOM generation for audit trail tracking
- Format: `urn:uuid:...`

### metadata
- **timestamp**: ISO 8601 timestamp when SBOM was generated
- **tools**: Generation tool information
- **component**: Application/project being cataloged

### components
- Array of all dependencies with:
  - **name**, **version**, **purl**: Package identification
  - **licenses**: License expression from package.json
  - **homepage**: Project URL if available
  - **hashes**: SHA-256 integrity hash

### vulnerabilities (optional, with --include-vulns)
- Array of CVEs/vulnerabilities from npm audit
- Each includes: ref (pURL), id (CVE), severity, description, recommendations

### integrity
- SHA-256 hash of the entire SBOM for integrity verification
- Can be independently verified: `sha256(bom-content) === integrity.value`

## Integration Points

### CI/CD Workflows

Called from `.github/workflows/security-evidence.yml`:

```bash
node scripts/generate-sbom.mjs --include-dev --output=artifacts/bom.cdx.json
```

### Evidence Collection

Output is consumed by:

- `scripts/build-evidence-bundle.mjs` (Round 1)
- Compliance matrix generation
- SECURITY-HARDENING claim status

### Database Storage

SBOM hash is stored in `claim_readiness_artifacts` table:

```sql
INSERT INTO claim_readiness_artifacts (claim_id, artifact_type, hash, content)
VALUES (?, 'sbom', ?, ?)
```

## Technical Notes

### License Detection

1. Checks for LICENSE file in node_modules package directory
2. Falls back to `package.json` license field
3. Defaults to "NOASSERTION" if no license found

### Dependency Parsing

- Uses `package-lock.json` for authoritative version/integrity
- Walks `node_modules` tree to discover transitive dependencies
- Supports nested dependencies (up to depth 5)
- Deduplicates by package name (prefers direct dependencies)

### pURL Format

Follows Package URL specification: `pkg:npm/PACKAGE@VERSION`

Examples:
- `pkg:npm/ethers@6.16.0`
- `pkg:npm/@anthropic-ai/sdk@0.27.3`
- `pkg:npm/next@15.5.18`

### Vulnerability Fetching

- Uses `npm audit --json` for local vulnerability data
- Connects to npm's advisory database
- Filters to unique CVE IDs per package
- Severity levels: critical, high, medium, low

### Integrity Hash Verification

Verify SBOM integrity independently:

```bash
# Extract hash
HASH=$(jq -r '.integrity.value' artifacts/bom.cdx.json)

# Create SBOM without integrity field for hashing
jq 'del(.integrity)' artifacts/bom.cdx.json > /tmp/bom-temp.json

# Calculate hash
CALCULATED=$(sha256sum /tmp/bom-temp.json | cut -d' ' -f1)

# Compare
if [ "$HASH" = "$CALCULATED" ]; then
  echo "SBOM integrity verified"
else
  echo "SBOM integrity check failed"
fi
```

## Examples

### Generate complete SBOM with vulnerabilities

```bash
node scripts/generate-sbom.mjs --include-dev --include-vulns
```

Output:
```
[✓] SBOM generated: artifacts/bom.cdx.json
[✓] Components: 245 (prod+dev)
[✓] Vulnerabilities: 2 medium, 0 high, 0 critical
[✓] Integrity hash: sha256:0e418e...
[✓] Serial number: urn:uuid:a811...
```

### Generate XML SBOM for archival

```bash
node scripts/generate-sbom.mjs --format=xml --output=archives/sbom-2026-06.cdx.xml
```

### Generate production-only SBOM with custom path

```bash
node scripts/generate-sbom.mjs --output=evidence/sbom-prod.json
```

## References

- [CycloneDX Specification](https://cyclonedx.org/)
- [Package URL (pURL) Spec](https://github.com/package-url/purl-spec)
- [npm Security Advisories](https://docs.npmjs.com/cli/v10/commands/npm-audit)

## Implementation Details

### Node.js Runtime

- Node.js 18+ (uses native crypto module)
- ESM module (import/export)
- No external dependencies required

### File Paths

- Reads: `package.json`, `package-lock.json`, `node_modules/*/package.json`
- Writes: User-specified output path (default: `artifacts/bom.cdx.json`)

### Performance

- Fast for typical projects (< 1 second for 200+ dependencies)
- Parallel directory walking for node_modules traversal
- Single-pass JSON/XML generation

## Security Considerations

- Never embeds secrets in SBOM (checks environment variables only)
- Includes only metadata from package.json (no runtime data)
- Hash-based integrity allows detection of tampering
- Serial number enables audit trail and duplicate detection

## Troubleshooting

### "Failed to read package.json"

Make sure you're running from project root or set PROJECT_ROOT correctly.

### No dependencies found

- Check `node_modules` exists (run `npm install` first)
- Verify `package.json` has dependencies defined
- With `--include-dev`, check `devDependencies` section

### Vulnerability data unavailable

- `--include-vulns` requires npm audit to work
- Check npm registry connectivity
- Try running `npm audit` manually to test

### XML not well-formed

Verify special characters in dependency metadata are properly escaped (this is done automatically).

## Future Enhancements

- [ ] SBOM signature generation (Sigstore/Cosign)
- [ ] External Z3/NVD API integration for advanced vulnerability analysis
- [ ] SBOM diff generation between versions
- [ ] Custom license classification rules
- [ ] Transitive dependency license conflict detection
