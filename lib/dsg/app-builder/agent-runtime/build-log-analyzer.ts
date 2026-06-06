import { sha256 } from './decision-frame';

export type DsgBuildLogStatus = 'PASS' | 'FAIL' | 'REVIEW';

export type DsgBuildLogFinding = {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
};

export type DsgBuildLogAnalysis = {
  status: DsgBuildLogStatus;
  hash: string;
  summary: string;
  findings: DsgBuildLogFinding[];
  nextActions: string[];
  productionReadyClaim: false;
};

const typeScriptErrorPattern = /^\.\/(.+?):(\d+):(\d+)\s*$/gm;
const routePattern = /^\s*[├└]?[\s│]*[ƒ○]\s+([^\s]+)\s+/gm;

function detectTypeScriptFindings(log: string): DsgBuildLogFinding[] {
  const findings: DsgBuildLogFinding[] = [];
  let match: RegExpExecArray | null;
  while ((match = typeScriptErrorPattern.exec(log)) !== null) {
    const [, file, line, column] = match;
    const after = log.slice(match.index, match.index + 800);
    const message = after.match(/Type error:\s*([^\n]+)/)?.[1]?.trim() || 'TypeScript error detected';
    findings.push({ severity: 'error', code: 'TYPESCRIPT_ERROR', message, file, line: Number(line), column: Number(column) });
  }
  return findings;
}

function detectRoutes(log: string): DsgBuildLogFinding[] {
  const findings: DsgBuildLogFinding[] = [];
  let match: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((match = routePattern.exec(log)) !== null) {
    const route = match[1];
    if (!route || seen.has(route)) continue;
    seen.add(route);
    if (route.startsWith('/dsg/app-builder') || route.startsWith('/generated-apps') || route === '/product-ready') {
      findings.push({ severity: 'info', code: 'ROUTE_BUILT', message: `Route built: ${route}` });
    }
  }
  return findings;
}

export function analyzeBuildLog(log: string): DsgBuildLogAnalysis {
  const normalized = log.trim();
  const hash = sha256(normalized || 'empty-build-log');
  const findings: DsgBuildLogFinding[] = [];

  if (!normalized) {
    return {
      status: 'REVIEW',
      hash,
      summary: 'No build log was provided.',
      findings: [{ severity: 'warning', code: 'EMPTY_LOG', message: 'Paste Termux/Vercel build output before running analysis.' }],
      nextActions: ['Paste the real build output', 'Run npm run dsg:typecheck', 'Run npm run build:termux'],
      productionReadyClaim: false,
    };
  }

  findings.push(...detectTypeScriptFindings(normalized));
  findings.push(...detectRoutes(normalized));

  if (/Failed to compile|Type error:|Next\.js build worker exited with code: 1|Build failed/i.test(normalized)) {
    const hasSpecificError = findings.some((finding) => finding.severity === 'error');
    if (!hasSpecificError) {
      findings.push({ severity: 'error', code: 'BUILD_FAILED', message: 'Build failed, but no file/line TypeScript location was extracted.' });
    }
    return {
      status: 'FAIL',
      hash,
      summary: 'Build failed. DSG must not claim production-ready. Fix the first real error, then rerun deterministic build.',
      findings,
      nextActions: ['Fix the first error shown in findings', 'Run npm run dsg:typecheck', 'Run npm run build:termux', 'Paste the new log back into build proof analyzer'],
      productionReadyClaim: false,
    };
  }

  if (/Compiled successfully|Finalizing page optimization|\[dsg-build\] Restored app\/globals\.css/i.test(normalized)) {
    return {
      status: 'PASS',
      hash,
      summary: 'Build log indicates successful compilation. Production-ready still requires deploy/live/database proof.',
      findings,
      nextActions: ['Open generated app preview', 'Verify API/database GET and POST', 'Capture deployment proof', 'Only then move production claim from blocked to review/pass'],
      productionReadyClaim: false,
    };
  }

  return {
    status: 'REVIEW',
    hash,
    summary: 'Build log did not clearly pass or fail. Manual review required.',
    findings: findings.length ? findings : [{ severity: 'warning', code: 'UNCLASSIFIED_LOG', message: 'No deterministic pass/fail marker detected.' }],
    nextActions: ['Run npm run dsg:typecheck', 'Run npm run build:termux', 'Use the full output log for analysis'],
    productionReadyClaim: false,
  };
}
