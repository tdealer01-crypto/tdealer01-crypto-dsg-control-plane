'use client';

import { useEffect, useState } from 'react';

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

export function useAppLanguage(defaultLanguage: AppLanguage = 'th') {
  const [language, setLanguage] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    setLanguage(getStoredAppLanguage());
    const handle = (event: Event) => {
      const custom = event as CustomEvent<{ language?: AppLanguage }>;
      setLanguage(normalizeLanguage(custom.detail?.language));
    };
    window.addEventListener(DSG_LANGUAGE_EVENT, handle);
    return () => window.removeEventListener(DSG_LANGUAGE_EVENT, handle);
  }, []);

  return language;
}
