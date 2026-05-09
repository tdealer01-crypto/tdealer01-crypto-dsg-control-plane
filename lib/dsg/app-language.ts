'use client';

import { useSyncExternalStore } from 'react';

export type AppLanguage = 'th' | 'en';

export const DSG_LANGUAGE_EVENT = 'dsg-language-change';

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === 'en' ? 'en' : 'th';
}

export function getStoredAppLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'th';
  return normalizeLanguage(window.localStorage.getItem('dsg:language'));
}

export function applyAppLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('dsg:language', language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent(DSG_LANGUAGE_EVENT, { detail: { language } }));
}

function subscribeAppLanguage(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleChange = () => onStoreChange();
  window.addEventListener(DSG_LANGUAGE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(DSG_LANGUAGE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

export function useAppLanguage(defaultLanguage: AppLanguage = 'th') {
  return useSyncExternalStore(
    subscribeAppLanguage,
    getStoredAppLanguage,
    () => defaultLanguage,
  );
}
