'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/language-context';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('th')}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          language === 'th'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        title="Thai"
      >
        ไทย
      </button>
    </div>
  );
}
