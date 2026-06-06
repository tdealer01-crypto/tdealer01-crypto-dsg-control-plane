import type { DsgAppBuilderPrd } from '@/lib/dsg/app-builder/types/prd';
import type { DsgPlanDraft } from './types';

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'app';
}

function needsDatabase(prd: DsgAppBuilderPrd): boolean {
  const combined = [...prd.coreFeatures, ...prd.database, prd.useCase, prd.userProblem].join(' ').toLowerCase();
  return ['database', 'crud', 'task', 'contact', 'dashboard', 'form', 'submission', 'workspace', 'role'].some((word) => combined.includes(word));
}

function needsAccessControl(prd: DsgAppBuilderPrd): boolean {
  const combined = [...prd.coreFeatures, prd.useCase, prd.userProblem].join(' ').toLowerCase();
  return ['login', 'role', 'workspace', 'team', 'admin', 'rbac'].some((word) => combined.includes(word));
}

export function derivePlanFromPrd(prd: DsgAppBuilderPrd): DsgPlanDraft {
  const appSlug = slugPart(prd.title);
  const dbRequired = needsDatabase(prd);
  const accessRequired = needsAccessControl(prd);
  const jobId = `prd-plan-${appSlug}`;

  const actions: DsgPlanDraft['actions'] = [
    {
      id: 'lock_goal',
      label: 'Lock user goal and PRD draft',
      type: 'read_file',
      risk: 'LOW',
      wave: 0,
      dependsOn: [],
      reads: ['lib/dsg/app-builder/types/prd.ts'],
      writes: [],
      requiredSecrets: [],
      approved: true,
    },
    {
      id: 'generate_frontend',
      label: 'Generate app frontend page',
      type: 'write_file',
      risk: 'MEDIUM',
      wave: 1,
      dependsOn: ['lock_goal'],
      reads: [],
      writes: [`app/generated-apps/${appSlug}/page.tsx`],
      requiredSecrets: [],
      approved: true,
    },
    {
      id: 'generate_api',
      label: 'Generate server API route',
      type: 'write_file',
      risk: 'MEDIUM',
      wave: 1,
      dependsOn: ['lock_goal'],
      reads: [],
      writes: [`app/api/generated-apps/${appSlug}/items/route.ts`],
      requiredSecrets: [],
      approved: true,
    },
    {
      id: 'run_build',
      label: 'Run typecheck and build gate',
      type: 'run_command',
      risk: 'MEDIUM',
      wave: 2,
      dependsOn: ['generate_frontend', 'generate_api'],
      reads: [],
      writes: [],
      command: 'npm run build',
      requiredSecrets: [],
      approved: true,
    },
    {
      id: 'deployment_proof',
      label: 'Create deployment proof after preview deploy',
      type: 'deploy',
      risk: 'HIGH',
      wave: 3,
      dependsOn: ['run_build'],
      reads: [],
      writes: [],
      requiredSecrets: ['VERCEL_TOKEN'],
      approved: false,
    },
  ];

  if (dbRequired) {
    actions.splice(3, 0, {
      id: 'generate_database_migration',
      label: 'Generate Supabase migration',
      type: 'create_database',
      risk: 'HIGH',
      wave: 2,
      dependsOn: ['generate_api'],
      reads: [],
      writes: [`supabase/migrations/create_${appSlug.replace(/-/g, '_')}.sql`],
      requiredSecrets: ['SUPABASE_SERVICE_ROLE_KEY'],
      approved: false,
    });
    actions.find((action) => action.id === 'run_build')?.dependsOn.push('generate_database_migration');
  }

  if (accessRequired) {
    actions.splice(3, 0, {
      id: 'add_access_control',
      label: 'Add generated app access control boundary',
      type: 'change_permission',
      risk: 'HIGH',
      wave: 2,
      dependsOn: ['generate_api'],
      reads: [],
      writes: [`lib/dsg/generated-apps/${appSlug}/access.ts`],
      requiredSecrets: [],
      approved: false,
    });
    actions.find((action) => action.id === 'run_build')?.dependsOn.push('add_access_control');
  }

  return {
    jobId,
    workspaceId: 'dsg-one-v1-default',
    goalLocked: true,
    planExists: true,
    allowedPaths: ['app', 'lib', 'components', 'supabase/migrations', 'docs'],
    allowedCommands: ['npm run build', 'npm run dsg:typecheck', 'npm run smoke:memory-api'],
    availableSecrets: [],
    actions,
    claimBoundary: {
      claimStatus: 'PLAN_DRAFT_ONLY',
      productionReadyClaim: false,
      runtimeExecutionReady: false,
    },
  };
}
