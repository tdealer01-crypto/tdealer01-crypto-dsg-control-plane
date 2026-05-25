'use client';

import { useSyncExternalStore } from 'react';
import { languageStore, type AppLanguage } from '@/store/languageStore';

export type { AppLanguage };
export { DSG_LANGUAGE_EVENT } from '@/store/languageStore';

export function getStoredAppLanguage(): AppLanguage {
  return languageStore.getSnapshot();
}

export function applyAppLanguage(language: AppLanguage) {
  languageStore.setLanguage(language);
}

export function useAppLanguage(defaultLanguage: AppLanguage = 'th'): AppLanguage {
  return useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    () => defaultLanguage,
  );
}
