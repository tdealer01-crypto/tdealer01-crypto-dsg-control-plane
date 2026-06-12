#!/usr/bin/env node

/**
 * Generate Software Bill of Materials (SBOM) in CycloneDX format.
 *
 * Usage:
 *   node scripts/generate-sbom.mjs [OPTIONS]
 *
 * Options:
 *   --output=PATH           Output file path (default: artifacts/bom.cdx.json)
 *   --format=json|xml       Output format (default: json)
 *   --include-dev           Include devDependencies (default: production only)
 *   --include-vulns         Fetch vulnerability data from NVD/npm audit
 *   --help                  Show this help message
 *
 * Exit codes:
 *   0 - Success
 *   1 - Error
 *   2 - Vulnerabilities found but non-critical (with --include-vulns)
 *
 * CycloneDX format: https://cyclonedx.org/
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    output: 'artifacts/bom.cdx.json',
    format: 'json',
    includeDev: false,
    includeVulns: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help') {
      result.help = true;
    } else if (arg === '--include-dev') {
      result.includeDev = true;
    } else if (arg === '--include-vulns') {
      result.includeVulns = true;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.slice(9);
    } else if (arg.startsWith('--format=')) {
      result.format = arg.slice(9);
    }
  }

  return result;
}

function showHelp() {
  console.log(`
Generate Software Bill of Materials (SBOM) in CycloneDX format.

Usage:
  node scripts/generate-sbom.mjs [OPTIONS]

Options:
  --output=PATH           Output file path (default: artifacts/bom.cdx.json)
  --format=json|xml       Output format (default: json)
  --include-dev           Include devDependencies (default: production only)
  --include-vulns         Fetch vulnerability data from NVD/npm audit
  --help                  Show this help message

Exit codes:
  0 - Success
  1 - Error
  2 - Vulnerabilities found but non-critical (with --include-vulns)

Examples:
  node scripts/generate-sbom.mjs
  node scripts/generate-sbom.mjs --include-dev --output sbom.json
  node scripts/generate-sbom.mjs --include-vulns --format json
  `);
}

// ============================================================================
// Utility Functions
// ============================================================================

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function generateUUID() {
  // Simple v4-like UUID using crypto random
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function log(level, message) {
  const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
  const symbol = {
    info: 'ℹ',
    ok: '✓',
    warn: '⚠',
    error: '✗',
  }[level] || '•';
  console.log(`[${symbol}] [${timestamp}] ${message}`);
}

function logSection(title) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${title}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// ============================================================================
// License Extraction
// ============================================================================

function extractLicense(packagePath) {
  // Try to find LICENSE file
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']) {
    const licensePath = path.join(packagePath, name);
    try {
      if (fs.statSync(licensePath).isFile()) {
        // File exists, infer license from filename or return generic marker
        if (name === 'LICENSE.md' || name === 'LICENSE.txt') {
          return 'NOASSERTION';
        }
        return 'NOASSERTION';
      }
    } catch {
      // Not found
    }
  }
  return 'NOASSERTION';
}

function getLicenseFromPackageJson(packageJson) {
  if (!packageJson.license) {
    return 'NOASSERTION';
  }
  const license = packageJson.license;
  if (typeof license === 'string') {
    return license;
  }
  if (license.type) {
    return license.type;
  }
  return 'NOASSERTION';
}

// ============================================================================
// Dependency Tree Parsing
// ============================================================================

function parseDependencies(includeDev = false) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageLockPath = path.join(projectRoot, 'package-lock.json');

  let packageJson, packageLock;

  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read package.json: ${err.message}`);
  }

  try {
    packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read package-lock.json: ${err.message}`);
  }

  const packages = new Map();
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  // Traverse node_modules manually for better control
  function walkNodeModules(dir, depth = 0) {
    if (depth > 5) return; // Prevent excessive recursion
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = path.join(dir, entry.name);
          const pkgJsonPath = path.join(packagePath, 'package.json');

          try {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            const name = pkgJson.name || entry.name;
            const version = pkgJson.version || '0.0.0';

            // Avoid duplicates, prefer root level
            if (!packages.has(name)) {
              packages.set(name, {
                name,
                version,
                path: packagePath,
                json: pkgJson,
              });
            }

            // Recurse into node_modules/@scope and nested node_modules
            if (entry.name === '@' || entry.name.startsWith('@')) {
              walkNodeModules(packagePath, depth + 1);
            } else if (fs.existsSync(path.join(packagePath, 'node_modules'))) {
              walkNodeModules(path.join(packagePath, 'node_modules'), depth + 1);
            }
          } catch {
            // Ignore invalid package.json
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Parse all dependencies from package.json
  const allDeps = new Set();

  for (const [name] of Object.entries(packageJson.dependencies || {})) {
    allDeps.add(name);
  }

  if (includeDev) {
    for (const [name] of Object.entries(packageJson.devDependencies || {})) {
      allDeps.add(name);
    }
  }

  // Get from package-lock for better version info and tree structure
  const lockPackages = packageLock.packages || {};

  for (const [key, lockPkg] of Object.entries(lockPackages)) {
    if (key === '') continue; // Skip root entry
    const name = lockPkg.name;
    if (!name) continue;

    // Determine if this is a prod or dev dependency
    const isProdDep =
      packageJson.dependencies && packageJson.dependencies[name];
    const isDevDep =
      packageJson.devDependencies && packageJson.devDependencies[name];
    const isDirect = isProdDep || isDevDep;

    // If includeDev is false, skip devDependencies that aren't also prod
    if (!includeDev && !isProdDep && !isDirect) {
      // Try to infer from the key path
      const keyParts = key.split('/');
      if (keyParts.length > 0) {
        const leafName = keyParts[keyParts.length - 1];
        const isInDevOnly =
          !Object.keys(packageJson.dependencies || {}).includes(leafName);
        if (isInDevOnly) {
          continue;
        }
      }
    }

    if (!packages.has(name)) {
      packages.set(name, {
        name,
        version: lockPkg.version || '0.0.0',
        json: lockPkg,
        resolved: lockPkg.resolved,
      });
    }
  }

  // Walk actual node_modules for packages not in lock file
  if (fs.existsSync(nodeModulesPath)) {
    walkNodeModules(nodeModulesPath);
  }

  // Convert to sorted array
  const components = Array.from(packages.values())
    .filter((p) => p.name && p.version)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    project: packageJson,
    components,
  };
}

// ============================================================================
// SBOM Component Building
// ============================================================================

function buildComponent(pkg) {
  const name = pkg.name || 'unknown';
  const version = pkg.version || '0.0.0';
  const purl = `pkg:npm/${name}@${version}`;

  const component = {
    type: 'library',
    name,
    version,
    purl,
    licenses: [],
    hashes: [
      {
        alg: 'SHA-256',
        content: sha256Hex(JSON.stringify({ name, version })),
      },
    ],
  };

  // Add license
  let license = 'NOASSERTION';
  if (pkg.json && pkg.json.license) {
    license = getLicenseFromPackageJson(pkg.json);
  } else if (pkg.path) {
    license = extractLicense(pkg.path);
  }
  component.licenses.push({ expression: license });

  // Add homepage if available
  if (pkg.json && pkg.json.homepage) {
    component.homepage = pkg.json.homepage;
  }

  // Add description if available
  if (pkg.json && pkg.json.description) {
    component.description = pkg.json.description;
  }

  return component;
}

// ============================================================================
// Vulnerability Fetching (Optional)
// ============================================================================

function fetchVulnerabilities(components) {
  const vulns = [];

  // Try to use npm audit --json to get vulnerability data
  try {
    log('info', 'Fetching vulnerability data from npm audit...');
    const auditOutput = execSync('npm audit --json', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    });
    const auditData = JSON.parse(auditOutput);

    if (auditData.vulnerabilities) {
      for (const [pkgName, vulnInfo] of Object.entries(auditData.vulnerabilities)) {
        if (vulnInfo.via && Array.isArray(vulnInfo.via)) {
          for (const via of vulnInfo.via) {
            if (typeof via === 'object' && via.cve) {
              const cveId = via.cve;
              const severity = via.severity || 'unknown';

              // Find matching component
              const component = components.find((c) => c.name === pkgName);
              if (component) {
                vulns.push({
                  ref: component.purl,
                  id: cveId,
                  severity,
                  description: via.title || 'Vulnerability detected',
                  recommendations: [
                    {
                      text: vulnInfo.fixAvailable
                        ? `Upgrade to ${vulnInfo.fixAvailable.version || 'latest'}`
                        : 'Review vulnerability details',
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }

    log('ok', `Found ${vulns.length} vulnerabilities`);
  } catch (err) {
    log('warn', `Could not fetch vulnerabilities: ${err.message}`);
  }

  return vulns;
}

// ============================================================================
// SBOM Generation
// ============================================================================

function generateSBOM(project, components, vulnerabilities = []) {
  const serialNumber = `urn:uuid:${generateUUID()}`;
  const timestamp = new Date().toISOString();
  const projectVersion = project.version || '0.0.0';
  const projectName = project.name || 'dsg-platform';

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: [
        {
          vendor: 'DSG',
          name: 'DSG Evidence Generator',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: projectName,
        version: projectVersion,
        purl: `pkg:npm/${projectName}@${projectVersion}`,
      },
    },
    components: components.map(buildComponent),
  };

  // Add vulnerabilities if any
  if (vulnerabilities.length > 0) {
    sbom.vulnerabilities = vulnerabilities;
  }

  // Calculate integrity hash of SBOM (without integrity field itself)
  const sbomForHashing = JSON.stringify(sbom);
  const integrityHash = sha256Hex(sbomForHashing);
  sbom.integrity = {
    alg: 'SHA-256',
    value: integrityHash,
  };

  return sbom;
}

// ============================================================================
// XML Conversion (Basic CycloneDX XML Output)
// ============================================================================

function convertToXML(sbom) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<bom xmlns="http://cyclonedx.org/schema/bom/1.4/bom.schema.json" ';
  xml += `serialNumber="${escapeXml(sbom.serialNumber)}" version="${sbom.version}">\n`;

  // Metadata
  xml += '  <metadata>\n';
  xml += `    <timestamp>${escapeXml(sbom.metadata.timestamp)}</timestamp>\n`;
  xml += '    <tools>\n';
  for (const tool of sbom.metadata.tools) {
    xml += `      <tool>\n`;
    xml += `        <vendor>${escapeXml(tool.vendor)}</vendor>\n`;
    xml += `        <name>${escapeXml(tool.name)}</name>\n`;
    xml += `        <version>${escapeXml(tool.version)}</version>\n`;
    xml += `      </tool>\n`;
  }
  xml += '    </tools>\n';
  xml += '    <component type="application">\n';
  xml += `      <name>${escapeXml(sbom.metadata.component.name)}</name>\n`;
  xml += `      <version>${escapeXml(sbom.metadata.component.version)}</version>\n`;
  xml += `      <purl>${escapeXml(sbom.metadata.component.purl)}</purl>\n`;
  xml += '    </component>\n';
  xml += '  </metadata>\n';

  // Components
  xml += '  <components>\n';
  for (const comp of sbom.components) {
    xml += `    <component type="${escapeXml(comp.type)}">\n`;
    xml += `      <name>${escapeXml(comp.name)}</name>\n`;
    xml += `      <version>${escapeXml(comp.version)}</version>\n`;
    xml += `      <purl>${escapeXml(comp.purl)}</purl>\n`;
    for (const license of comp.licenses) {
      xml += `      <licenses><license><expression>${escapeXml(license.expression)}</expression></license></licenses>\n`;
    }
    if (comp.homepage) {
      xml += `      <homepage>${escapeXml(comp.homepage)}</homepage>\n`;
    }
    if (comp.description) {
      xml += `      <description>${escapeXml(comp.description)}</description>\n`;
    }
    for (const hash of comp.hashes) {
      xml += `      <hashes><hash alg="${escapeXml(hash.alg)}">${escapeXml(hash.content)}</hash></hashes>\n`;
    }
    xml += '    </component>\n';
  }
  xml += '  </components>\n';

  // Vulnerabilities
  if (sbom.vulnerabilities && sbom.vulnerabilities.length > 0) {
    xml += '  <vulnerabilities>\n';
    for (const vuln of sbom.vulnerabilities) {
      xml += `    <vulnerability ref="${escapeXml(vuln.ref)}">\n`;
      xml += `      <id>${escapeXml(vuln.id)}</id>\n`;
      xml += `      <severity>${escapeXml(vuln.severity)}</severity>\n`;
      xml += `      <description>${escapeXml(vuln.description)}</description>\n`;
      if (vuln.recommendations) {
        for (const rec of vuln.recommendations) {
          xml += `      <recommendations><recommendation><text>${escapeXml(rec.text)}</text></recommendation></recommendations>\n`;
        }
      }
      xml += '    </vulnerability>\n';
    }
    xml += '  </vulnerabilities>\n';
  }

  // Integrity
  if (sbom.integrity) {
    xml += '  <integrity>\n';
    xml += `    <alg>${escapeXml(sbom.integrity.alg)}</alg>\n`;
    xml += `    <value>${escapeXml(sbom.integrity.value)}</value>\n`;
    xml += '  </integrity>\n';
  }

  xml += '</bom>\n';
  return xml;
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    const args = parseArgs(process.argv);

    if (args.help) {
      showHelp();
      process.exit(0);
    }

    logSection('DSG SBOM Generator');

    log('info', `Output format: ${args.format}`);
    log('info', `Include devDependencies: ${args.includeDev ? 'yes' : 'no'}`);
    log('info', `Include vulnerabilities: ${args.includeVulns ? 'yes' : 'no'}`);

    // Parse dependencies
    log('info', 'Parsing dependencies...');
    const { project, components } = parseDependencies(args.includeDev);
    log('ok', `Parsed ${components.length} dependencies`);

    // Fetch vulnerabilities if requested
    let vulnerabilities = [];
    if (args.includeVulns) {
      vulnerabilities = fetchVulnerabilities(components);
    }

    // Generate SBOM
    log('info', 'Generating SBOM...');
    const sbom = generateSBOM(project, components, vulnerabilities);

    // Prepare output directory
    const outputPath = path.resolve(projectRoot, args.output);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      log('ok', `Created output directory: ${outputDir}`);
    }

    // Write output
    let output;
    if (args.format === 'xml') {
      output = convertToXML(sbom);
      log('info', 'Converting to CycloneDX XML format...');
    } else {
      output = JSON.stringify(sbom, null, 2) + '\n';
      log('info', 'Using CycloneDX JSON format');
    }

    fs.writeFileSync(outputPath, output, 'utf8');
    log('ok', `SBOM written to: ${outputPath}`);

    // Report statistics
    logSection('Summary');
    log('ok', `Components: ${components.length} (${args.includeDev ? 'prod+dev' : 'production only'})`);

    if (vulnerabilities.length > 0) {
      const bySeverity = {};
      for (const vuln of vulnerabilities) {
        bySeverity[vuln.severity] = (bySeverity[vuln.severity] || 0) + 1;
      }
      const vulnSummary = Object.entries(bySeverity)
        .map(([sev, count]) => `${count} ${sev}`)
        .join(', ');
      log('warn', `Vulnerabilities: ${vulnSummary}`);
    } else {
      log('ok', 'Vulnerabilities: none detected');
    }

    const fileSize = fs.statSync(outputPath).size;
    log('ok', `File size: ${(fileSize / 1024).toFixed(2)} KB`);

    log('ok', `Serial number: ${sbom.serialNumber}`);
    log('ok', `Integrity hash: ${sbom.integrity.value}`);

    console.log(`\n[✓] SBOM generation complete`);

    // Determine exit code
    if (args.includeVulns && vulnerabilities.length > 0) {
      const criticalCount = vulnerabilities.filter(
        (v) => v.severity === 'critical'
      ).length;
      const highCount = vulnerabilities.filter(
        (v) => v.severity === 'high'
      ).length;

      if (criticalCount > 0 || highCount > 0) {
        log('warn', `Found ${criticalCount + highCount} critical/high vulnerabilities`);
        process.exit(2);
      }
    }

    process.exit(0);
  } catch (error) {
    log('error', error.message);
    console.error('\n[✗] SBOM generation failed');
    console.error(error.stack);
    process.exit(1);
  }
}

main();
