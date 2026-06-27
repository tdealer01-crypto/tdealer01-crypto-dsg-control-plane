import type { AppBuilderPrd, LockedAppBuilderGoal } from './model';

export function createDeterministicAppBuilderPrd(goal: LockedAppBuilderGoal): AppBuilderPrd {
  return {
    title: `DSG App Builder: ${goal.normalizedGoal.slice(0, 80)}`,
    summary: goal.normalizedGoal,
    userProblem: 'Create a governed app-building plan from a locked user goal.',
    targetUsers: ['workspace user', 'operator', 'reviewer'],
    coreFeatures: ['goal lock', 'PRD', 'plan', 'gate', 'approval', 'handoff'],
    nonGoals: ['runtime execution', 'preview deployment', 'production claim'],
    dataModelNotes: [`database: ${goal.targetStack.database ?? 'none'}`],
    authNotes: [`auth: ${goal.targetStack.auth ?? 'none'}`],
    uiNotes: [`frontend: ${goal.targetStack.frontend ?? 'nextjs'}`],
    acceptanceCriteria: goal.successCriteria.length
      ? goal.successCriteria
      : ['PRD exists', 'plan exists', 'gate result exists', 'handoff requires approval'],
  };
}
