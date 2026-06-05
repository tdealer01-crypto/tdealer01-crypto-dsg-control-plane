'use client';

import { useSyncExternalStore } from 'react';
import { languageStore, type AppLanguage } from './languageStore';

export function useAppLanguage(defaultLanguage: AppLanguage = 'th'): AppLanguage {
  return useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    () => defaultLanguage,
  );
}
