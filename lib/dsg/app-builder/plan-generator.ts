import type {
  AppBuilderPlanStep,
  AppBuilderPrd,
  AppBuilderProposedPlan,
  LockedAppBuilderGoal,
} from './model';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createAppBuilderProposedPlan(input: {
  goal: LockedAppBuilderGoal;
  prd: AppBuilderPrd;
}): AppBuilderProposedPlan {
  const needsDb = input.goal.targetStack.database !== 'none';
  const needsAuth = input.goal.targetStack.auth !== 'none';

  const steps: AppBuilderPlanStep[] = [
    {
      id: 'inspect-repo',
      title: 'Inspect repository',
      phase: 'INSPECT',
      riskLevel: 'LOW',
      requiresApproval: false,
      allowedPaths: ['package.json', 'app/**', 'components/**', 'lib/**', 'docs/**'],
      allowedCommands: ['npm run typecheck', 'npm run lint'],
      requiredSecrets: [],
      expectedEvidence: ['repo-inspection-report'],
    },
    {
      id: 'design-app-structure',
      title: 'Design app structure',
      phase: 'DESIGN',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      allowedPaths: ['docs/**', 'lib/dsg/**'],
      allowedCommands: [],
      requiredSecrets: [],
      expectedEvidence: ['design-plan'],
    },
    {
      id: 'implement-frontend',
      title: 'Implement frontend',
      phase: 'IMPLEMENT_FRONTEND',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      allowedPaths: ['app/**', 'components/**', 'lib/**'],
      allowedCommands: ['npm run typecheck', 'npm run lint'],
      requiredSecrets: [],
      expectedEvidence: ['frontend-diff', 'typecheck-output'],
    },
    {
      id: 'implement-backend',
      title: 'Implement backend',
      phase: 'IMPLEMENT_BACKEND',
      riskLevel: 'HIGH',
      requiresApproval: true,
      allowedPaths: ['app/api/**', 'lib/**'],
      allowedCommands: ['npm run typecheck', 'npm run lint'],
      requiredSecrets: [],
      expectedEvidence: ['backend-diff', 'typecheck-output'],
    },
    {
      id: 'database-schema',
      title: 'Prepare database schema',
      phase: 'DATABASE',
      riskLevel: needsDb ? 'HIGH' : 'LOW',
      requiresApproval: needsDb,
      allowedPaths: ['supabase/migrations/**', 'lib/**'],
      allowedCommands: ['npm run typecheck'],
      requiredSecrets: needsDb ? ['SUPABASE_DATABASE_URL_RESOLVED', 'SUPABASE_SERVICE_ROLE_KEY'] : [],
      expectedEvidence: ['migration-file', 'migration-check-output'],
    },
    {
      id: 'auth-rbac',
      title: 'Prepare auth and RBAC',
      phase: 'AUTH',
      riskLevel: needsAuth ? 'HIGH' : 'LOW',
      requiresApproval: needsAuth,
      allowedPaths: ['app/**', 'lib/**', 'supabase/migrations/**'],
      allowedCommands: ['npm run typecheck', 'npm run lint'],
      requiredSecrets: needsAuth ? ['SUPABASE_DATABASE_URL_RESOLVED', 'SUPABASE_SERVICE_ROLE_KEY'] : [],
      expectedEvidence: ['auth-rbac-diff', 'auth-check-output'],
    },
    {
      id: 'verify-claim',
      title: 'Verify claim boundary',
      phase: 'VERIFY',
      riskLevel: 'HIGH',
      requiresApproval: true,
      allowedPaths: ['docs/**', 'lib/dsg/**'],
      allowedCommands: ['npm run typecheck', 'npm run test'],
      requiredSecrets: [],
      expectedEvidence: ['audit-export', 'evidence-manifest', 'replay-proof'],
    },
  ];

  return {
    title: input.prd.title,
    summary: input.prd.summary,
    steps,
    allowedTools: ['file.read', 'file.write', 'file.patch', 'shell.run', 'claim.verify'],
    allowedPaths: unique(steps.flatMap((step) => step.allowedPaths)),
    allowedCommands: unique(steps.flatMap((step) => step.allowedCommands)),
    requiredSecrets: unique(steps.flatMap((step) => step.requiredSecrets)),
    estimatedRiskLevel: 'HIGH',
  };
}
