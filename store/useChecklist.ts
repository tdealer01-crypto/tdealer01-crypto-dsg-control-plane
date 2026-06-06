'use client';

import { useSyncExternalStore } from 'react';
import { checklistStore } from './checklistStore';

export function useChecklist() {
  const state = useSyncExternalStore(
    checklistStore.subscribe,
    checklistStore.getSnapshot,
    checklistStore.getServerSnapshot,
  );

  return {
    dismissed: state.dismissed,
    completedSteps: state.completedSteps,
    dismiss:       () => checklistStore.update({ dismissed: true }),
    restore:       () => checklistStore.update({ dismissed: false }),
    completeStep:  (id: string) =>
      checklistStore.update({
        completedSteps: state.completedSteps.includes(id)
          ? [...state.completedSteps]
          : [...state.completedSteps, id],
      }),
    uncompleteStep: (id: string) =>
      checklistStore.update({
        completedSteps: [...state.completedSteps].filter((s) => s !== id),
      }),
    toggleStep: (id: string) =>
      checklistStore.update({
        completedSteps: state.completedSteps.includes(id)
          ? [...state.completedSteps].filter((s) => s !== id)
          : [...state.completedSteps, id],
      }),
  };
}
