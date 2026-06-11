/**
 * Language Configuration
 *
 * Allows users to set their preferred language for AI agent responses.
 * Supported languages: en, th, zh, ja, es, fr, de, ko
 */

export type SupportedLanguage = 'en' | 'th' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  th: 'ไทย (Thai)',
  zh: '中文 (Chinese)',
  ja: '日本語 (Japanese)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  ko: '한국어 (Korean)',
};

export const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en',
  th: 'th',
  zh: 'zh',
  ja: 'ja',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ko: 'ko',
};

/**
 * Get the current preferred language from environment
 * Default: 'en' (English)
 */
export function getPreferredLanguage(): SupportedLanguage {
  const envLang = process.env.PREFERRED_LANGUAGE?.toLowerCase() as SupportedLanguage | undefined;

  if (envLang && envLang in LANGUAGE_NAMES) {
    return envLang;
  }

  return 'en'; // Default to English
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return lang in LANGUAGE_NAMES;
}

/**
 * Get language instruction prompt for AI agents
 */
export function getLanguageInstructionPrompt(language?: SupportedLanguage): string {
  const lang = language || getPreferredLanguage();

  const instructions: Record<SupportedLanguage, string> = {
    en: 'Respond in English.',
    th: 'ตอบเป็นภาษาไทย (Respond in Thai language).',
    zh: '用中文回答。(Respond in Chinese)',
    ja: '日本語で答えてください。(Respond in Japanese)',
    es: 'Responde en español. (Respond in Spanish)',
    fr: 'Répondez en français. (Respond in French)',
    de: 'Antworte auf Deutsch. (Respond in German)',
    ko: '한국어로 답변하세요. (Respond in Korean)',
  };

  return instructions[lang];
}

/**
 * Get current language display name
 */
export function getLanguageDisplayName(language?: SupportedLanguage): string {
  const lang = language || getPreferredLanguage();
  return LANGUAGE_NAMES[lang];
}
