import type {
  AppBuilderGoalInput,
  AppBuilderTargetStack,
  LockedAppBuilderGoal,
} from './model';
import { hashAppBuilderObject } from './hash';

function text(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function list(values?: string[]): string[] {
  return Array.from(new Set((values ?? []).map(text).filter(Boolean)));
}

function stack(input?: AppBuilderTargetStack): AppBuilderTargetStack {
  return {
    frontend: input?.frontend ?? 'nextjs',
    backend: input?.backend ?? 'next-api',
    database: input?.database ?? 'supabase-postgres',
    auth: input?.auth ?? 'supabase-auth',
    deploy: input?.deploy ?? 'vercel',
  };
}

export function lockAppBuilderGoal(
  input: AppBuilderGoalInput,
): LockedAppBuilderGoal {
  const originalGoal = input.goal ?? '';
  const normalizedGoal = text(originalGoal);

  if (!normalizedGoal) {
    throw new Error('APP_BUILDER_GOAL_REQUIRED');
  }

  const successCriteria = list(input.successCriteria);
  const constraints = list(input.constraints);
  const targetStack = stack(input.targetStack);
  const lockedAt = new Date().toISOString();
  const goalHash = hashAppBuilderObject({
    normalizedGoal,
    successCriteria,
    targetStack,
    constraints,
  });

  return {
    originalGoal,
    normalizedGoal,
    successCriteria,
    targetStack,
    constraints,
    lockedAt,
    goalHash,
  };
}
