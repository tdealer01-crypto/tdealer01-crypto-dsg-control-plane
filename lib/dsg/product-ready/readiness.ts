import {buildDecisionFrame} from './decision-frame';

export type ReadinessLevel = 'BLOCKED' | 'PILOT_READY' | 'PRODUCT_READY';

export type ReadinessCheck = {
  id: string;
  label: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  evidence: string;
  requiredForProduction: boolean;
};

export type ProductReadinessReport = {
  productName: string;
  level: ReadinessLevel;
  generatedAt: string;
  decisionFrame: ReturnType<typeof buildDecisionFrame>;
  checks: ReadinessCheck[];
  nextActions: string[];
};

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes('MY_'));
}

export function assessProductReadiness(env: NodeJS.ProcessEnv = process.env): ProductReadinessReport {
  const checks: ReadinessCheck[] = [
    {
      id: 'supabase-url',
      label: 'Server Supabase URL is configured',
      status: present(env.DSG_ONE_V1_SUPABASE_URL) || present(env.SUPABASE_URL) ? 'PASS' : 'FAIL',
      evidence: 'DSG_ONE_V1_SUPABASE_URL or SUPABASE_URL',
      requiredForProduction: true,
    },
    {
      id: 'supabase-service-role',
      label: 'Server Supabase service role is configured',
      status: present(env.DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY) || present(env.SUPABASE_SERVICE_ROLE_KEY) ? 'PASS' : 'FAIL',
      evidence: 'DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY',
      requiredForProduction: true,
    },
    {
      id: 'github-token',
      label: 'GitHub writer credential is configured',
      status: present(env.GITHUB_TOKEN) ? 'PASS' : 'FAIL',
      evidence: 'GITHUB_TOKEN',
      requiredForProduction: true,
    },
    {
      id: 'builder-repo',
      label: 'Builder repository target is configured',
      status: present(env.DSG_BUILDER_GITHUB_OWNER) && present(env.DSG_BUILDER_GITHUB_REPO) && present(env.DSG_BUILDER_BASE_BRANCH) ? 'PASS' : 'WARN',
      evidence: 'DSG_BUILDER_GITHUB_OWNER, DSG_BUILDER_GITHUB_REPO, DSG_BUILDER_BASE_BRANCH',
      requiredForProduction: true,
    },
    {
      id: 'dev-header-disabled',
      label: 'Development actor header bridge is disabled',
      status: env.DSG_ALLOW_DEV_HEADER_ACTOR === 'true' ? 'FAIL' : 'PASS',
      evidence: 'DSG_ALLOW_DEV_HEADER_ACTOR must not be true in production',
      requiredForProduction: true,
    },
    {
      id: 'app-url',
      label: 'Canonical APP_URL is configured',
      status: present(env.APP_URL) ? 'PASS' : 'WARN',
      evidence: 'APP_URL',
      requiredForProduction: false,
    },
    {
      id: 'vercel-proof',
      label: 'Optional Vercel deployment proof variables exist',
      status: present(env.VERCEL_TOKEN) && present(env.VERCEL_ORG_ID) && present(env.VERCEL_PROJECT_ID) ? 'PASS' : 'WARN',
      evidence: 'VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID',
      requiredForProduction: false,
    },
  ];

  const productionFailures = checks.filter((check) => check.requiredForProduction && check.status === 'FAIL');
  const warnings = checks.filter((check) => check.status === 'WARN');
  const level: ReadinessLevel = productionFailures.length > 0 ? 'BLOCKED' : warnings.length > 0 ? 'PILOT_READY' : 'PRODUCT_READY';

  return {
    productName: 'DSG ONE V1 Product Ready Fullstack',
    level,
    generatedAt: new Date().toISOString(),
    decisionFrame: buildDecisionFrame({
      question: 'Is DSG ONE V1 ready to run as a governed app-builder product?',
      target: 'truthful product readiness assessment before any production claim',
      history: checks.map((check) => `${check.status}:${check.id}`),
      verified: productionFailures.length === 0,
    }),
    checks,
    nextActions: productionFailures.length
      ? productionFailures.map((check) => `Fix ${check.id}: ${check.label}`)
      : ['Run npm run dsg:product-ready', 'Run a live App Builder job', 'Export proof evidence before claiming PRODUCTION_VERIFIED'],
  };
}

export function assertProductReady(env: NodeJS.ProcessEnv = process.env): ProductReadinessReport {
  const report = assessProductReadiness(env);
  if (report.level === 'BLOCKED') {
    const failed = report.checks.filter((check) => check.status === 'FAIL').map((check) => check.id).join(', ');
    throw new Error(`DSG_PRODUCT_READY_BLOCKED:${failed}`);
  }
  return report;
}
