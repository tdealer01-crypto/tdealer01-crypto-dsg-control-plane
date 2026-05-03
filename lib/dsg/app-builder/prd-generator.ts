import type { AppBuilderPrd, LockedAppBuilderGoal } from './model';

export function createDeterministicAppBuilderPrd(
  goal: LockedAppBuilderGoal,
): AppBuilderPrd {
  const criteria = goal.successCriteria.length
    ? goal.successCriteria
    : [
        'Locked goal is represented in the product plan.',
        'Backend state is the source of truth.',
        'No completion claim is made without evidence.',
      ];

  return {
    title: `DSG App Builder Plan: ${goal.normalizedGoal.slice(0, 80)}`,
    summary: goal.normalizedGoal,
    userProblem:
      'The user needs a governed app build flow before any runtime action.',
    targetUsers: ['workspace user', 'operator', 'reviewer'],
    coreFeatures: [
      'Locked goal',
      'Deterministic PRD',
      'Governed plan',
      'Plan gate',
      'Approval record',
      'Runtime handoff',
    ],
    nonGoals: [
      'No shell execution in Step 15',
      'No file patching in Step 15',
      'No preview deployment in Step 15',
      'No production claim in Step 15',
    ],
    dataModelNotes: [
      `Target database: ${goal.targetStack.database ?? 'unspecified'}`,
      'Builder jobs are persisted as planning source of truth.',
    ],
    authNotes: [
      `Target auth: ${goal.targetStack.auth ?? 'unspecified'}`,
      'Production trust must use server-side Auth/RBAC.',
    ],
    uiNotes: [
      `Target frontend: ${goal.targetStack.frontend ?? 'unspecified'}`,
      'UI must render backend state only.',
    ],
    acceptanceCriteria: criteria,
  };
}
