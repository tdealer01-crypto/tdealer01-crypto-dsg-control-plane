import type { Database } from '@/lib/database.types';

export type CheckType = 'ci_status' | 'migrations' | 'secrets' | 'coverage' | 'reviews';
export type CheckStatus = 'pass' | 'fail' | 'pending' | 'blocked';

export interface ReadinessCheck {
  type: CheckType;
  status: CheckStatus;
  message: string;
  details: Record<string, unknown>;
  blocksDeployment: boolean;
}

export interface ReadinessResult {
  overallStatus: 'ready' | 'review_required' | 'blocked';
  checks: ReadinessCheck[];
  timestamp: string;
  blockerCount: number;
  reviewCount: number;
  passCount: number;
}

export interface ReadinessConfig {
  minTestCoveragePercent: number;
  requireNApprovals: number;
  blockOnSecrets: boolean;
  blockOnFailedCI: boolean;
  autoMergeOnPass: boolean;
}

const DEFAULT_CONFIG: ReadinessConfig = {
  minTestCoveragePercent: 80,
  requireNApprovals: 2,
  blockOnSecrets: true,
  blockOnFailedCI: true,
  autoMergeOnPass: false,
};

// Simulated GitHub API responses for MVP
async function checkCIStatus(repoUrl: string): Promise<ReadinessCheck> {
  // In production: query GitHub API for latest workflow run status
  // For now: return deterministic mock based on repo characteristics
  const isMockPass = !repoUrl.includes('failing');

  return {
    type: 'ci_status',
    status: isMockPass ? 'pass' : 'fail',
    message: isMockPass
      ? 'All GitHub Actions workflows passed'
      : 'CI pipeline failed - review logs',
    details: {
      latestWorkflow: 'test.yml',
      status: isMockPass ? 'completed' : 'failed',
      duration: 245,
      timestamp: new Date().toISOString(),
    },
    blocksDeployment: !isMockPass,
  };
}

async function checkMigrations(repoUrl: string): Promise<ReadinessCheck> {
  // In production: scan for pending migrations in migrations/ directory
  const hasMigrations = Math.random() > 0.7; // 30% chance of pending migrations for demo

  return {
    type: 'migrations',
    status: hasMigrations ? 'review_required' : 'pass',
    message: hasMigrations
      ? 'Pending database migrations detected - review before deploy'
      : 'No pending migrations',
    details: {
      pendingCount: hasMigrations ? 2 : 0,
      migrations: hasMigrations
        ? ['0001_add_users_table.sql', '0002_add_policies_table.sql']
        : [],
      lastMigrationDate: new Date(Date.now() - 86400000).toISOString(),
    },
    blocksDeployment: false,
  };
}

async function checkSecrets(repoUrl: string): Promise<ReadinessCheck> {
  // In production: scan diff for common secret patterns (API keys, tokens, etc)
  const hasSecrets = Math.random() > 0.85; // 15% chance for demo

  return {
    type: 'secrets',
    status: hasSecrets ? 'fail' : 'pass',
    message: hasSecrets
      ? 'Possible secrets detected in diff - review before merging'
      : 'No secrets detected in diff',
    details: {
      secretsFound: hasSecrets ? 1 : 0,
      patterns: hasSecrets ? ['private_key', 'api_key'] : [],
      filesScanned: 12,
      scanDate: new Date().toISOString(),
    },
    blocksDeployment: hasSecrets,
  };
}

async function checkCoverage(coveragePercent: number, config: ReadinessConfig): Promise<ReadinessCheck> {
  const meetsThreshold = coveragePercent >= config.minTestCoveragePercent;

  return {
    type: 'coverage',
    status: meetsThreshold ? 'pass' : 'review_required',
    message: meetsThreshold
      ? `Test coverage ${coveragePercent}% meets minimum (${config.minTestCoveragePercent}%)`
      : `Test coverage ${coveragePercent}% below minimum (${config.minTestCoveragePercent}%)`,
    details: {
      currentCoverage: coveragePercent,
      minimumRequired: config.minTestCoveragePercent,
      uncoveredLines: Math.max(0, 100 - coveragePercent) * 50,
      trend: 'increasing',
    },
    blocksDeployment: false,
  };
}

async function checkReviews(approvalCount: number, config: ReadinessConfig): Promise<ReadinessCheck> {
  const meetsThreshold = approvalCount >= config.requireNApprovals;

  return {
    type: 'reviews',
    status: meetsThreshold ? 'pass' : 'review_required',
    message: meetsThreshold
      ? `PR approved by ${approvalCount} reviewers (requires ${config.requireNApprovals})`
      : `PR needs ${config.requireNApprovals - approvalCount} more approval(s)`,
    details: {
      currentApprovals: approvalCount,
      requiredApprovals: config.requireNApprovals,
      reviewers: ['alice@company.com', 'bob@company.com'].slice(0, approvalCount),
      commentCount: 3 + approvalCount,
    },
    blocksDeployment: false,
  };
}

export async function evaluateReadiness(
  repoUrl: string,
  config: ReadinessConfig = DEFAULT_CONFIG,
  coveragePercent: number = 82,
  approvalCount: number = 1
): Promise<ReadinessResult> {
  const checks = await Promise.all([
    checkCIStatus(repoUrl),
    checkMigrations(repoUrl),
    checkSecrets(repoUrl),
    checkCoverage(coveragePercent, config),
    checkReviews(approvalCount, config),
  ]);

  // Apply config-based blocking rules
  const blockedByConfig = checks.map(check => {
    if (check.type === 'ci_status' && config.blockOnFailedCI && check.status === 'fail') {
      return { ...check, blocksDeployment: true };
    }
    if (check.type === 'secrets' && config.blockOnSecrets && check.status === 'fail') {
      return { ...check, blocksDeployment: true };
    }
    return check;
  });

  const blockerCount = blockedByConfig.filter(c => c.blocksDeployment).length;
  const reviewCount = blockedByConfig.filter(c => c.status === 'review_required').length;
  const passCount = blockedByConfig.filter(c => c.status === 'pass').length;

  let overallStatus: 'ready' | 'review_required' | 'blocked';
  if (blockerCount > 0) {
    overallStatus = 'blocked';
  } else if (reviewCount > 0) {
    overallStatus = 'review_required';
  } else {
    overallStatus = 'ready';
  }

  return {
    overallStatus,
    checks: blockedByConfig,
    timestamp: new Date().toISOString(),
    blockerCount,
    reviewCount,
    passCount,
  };
}

export function getDefaultConfig(): ReadinessConfig {
  return { ...DEFAULT_CONFIG };
}
