import type { AppBuilderPlanStep, AppBuilderPrd, AppBuilderProposedPlan, LockedAppBuilderGoal } from './model';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createAppBuilderProposedPlan(input: {
  goal: LockedAppBuilderGoal;
  prd: AppBuilderPrd;
}): AppBuilderProposedPlan {
  const needsData = input.goal.targetStack.database !== 'none';
  const needsAuth = input.goal.targetStack.auth !== 'none';
  const needsDeploy = input.goal.targetStack.deploy !== 'none';

  const steps: AppBuilderPlanStep[] = [
    {
      id: 'inspect-repo',
      title: 'Inspect repository',
      description: 'Inspect routes, scripts, and existing project structure.',
      phase: 'INSPECT',
      riskLevel: 'LOW',
      requiresApproval: false,
      allowedPaths: ['app/**', 'components/**', 'lib/**', 'docs/**', 'package.json'],
      allowedCommands: ['npm run dsg:typecheck', 'npm run lint'],
      requiredSecrets: [],
      expectedEvidence: ['inspection-report'],
    },
    {
      id: 'design-plan',
      title: 'Design implementation plan',
      description: 'Design the app structure from the approved PRD.',
      phase: 'DESIGN',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      allowedPaths: ['docs/**', 'lib/dsg/**'],
      allowedCommands: [],
      requiredSecrets: [],
      expectedEvidence: ['design-plan'],
    },
    {
      id: 'launch-agent-runtime',
      title: 'Launch App Builder agent runtime',
      description: 'After plan gate and approval, call the App Builder orchestration tool to prepare runtime environment, action-layer tools, audit, and notification payload.',
      phase: 'DESIGN',
      riskLevel: 'HIGH',
      requiresApproval: true,
      allowedPaths: ['docs/**', 'app/**', 'components/**', 'lib/**', 'supabase/migrations/**'],
      allowedCommands: [],
      requiredSecrets: ['GITHUB_TOKEN'],
      expectedEvidence: ['runtime-environment-manifest', 'action-layer-contract', 'audit-event', 'notification-payload'],
    },
    {
      id: 'implement-app',
      title: 'Implement app surface',
      description: 'Implement frontend and backend surfaces through the approved App Builder runtime tool.',
      phase: 'IMPLEMENT_FRONTEND',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      allowedPaths: ['app/**', 'components/**', 'lib/**'],
      allowedCommands: ['npm run dsg:typecheck', 'npm run lint'],
      requiredSecrets: [],
      expectedEvidence: ['app-diff', 'typecheck-output'],
    },
    {
      id: 'data-auth-plan',
      title: 'Prepare data and auth plan',
      description: 'Prepare data/auth work only when the locked stack requires it.',
      phase: needsAuth ? 'AUTH' : needsData ? 'DATABASE' : 'DESIGN',
      riskLevel: needsAuth || needsData ? 'HIGH' : 'LOW',
      requiresApproval: needsAuth || needsData,
      allowedPaths: ['lib/**', 'docs/**', 'supabase/migrations/**'],
      allowedCommands: ['npm run dsg:typecheck'],
      requiredSecrets: [],
      expectedEvidence: ['data-auth-plan'],
    },
    {
      id: 'test-build-verify',
      title: 'Test and verify',
      description: 'Run checks and collect evidence before any completion claim.',
      phase: 'VERIFY',
      riskLevel: 'MEDIUM',
      requiresApproval: true,
      allowedPaths: ['app/**', 'components/**', 'lib/**', 'docs/**', 'package.json'],
      allowedCommands: ['npm run dsg:verify', 'npm run dsg:typecheck', 'npm run lint', 'npm run build'],
      requiredSecrets: [],
      expectedEvidence: ['verify-output', 'claim-gate-result'],
    },
  ];

  if (needsDeploy) {
    steps.push({
      id: 'deploy-preview-plan',
      title: 'Plan preview deployment',
      description: 'Prepare preview deployment only after Step 16 runtime approval.',
      phase: 'DEPLOY',
      riskLevel: 'HIGH',
      requiresApproval: true,
      allowedPaths: ['app/**', 'components/**', 'lib/**', 'docs/**', 'package.json'],
      allowedCommands: [],
      requiredSecrets: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
      expectedEvidence: ['deployment-plan'],
    });
  }

  return {
    title: input.prd.title,
    summary: input.prd.summary,
    steps,
    allowedTools: [
      'dsg.app_builder.launch_agent_runtime',
      'dsg.app_builder.generate_fullstack_pr',
      'dsg.environment.provision',
      'github.branch.create',
      'file.read',
      'file.write',
      'file.patch',
      'shell.run',
      'claim.verify',
      'audit.write',
      'notification.emit',
    ],
    allowedPaths: unique(steps.flatMap((step) => step.allowedPaths)),
    allowedCommands: unique(steps.flatMap((step) => step.allowedCommands)),
    requiredSecrets: unique(steps.flatMap((step) => step.requiredSecrets)),
    estimatedRiskLevel: steps.some((step) => step.riskLevel === 'HIGH') ? 'HIGH' : 'MEDIUM',
  };
}
