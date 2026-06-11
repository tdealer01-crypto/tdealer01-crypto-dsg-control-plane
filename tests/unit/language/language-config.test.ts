import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getPreferredLanguage,
  isLanguageSupported,
  getLanguageInstructionPrompt,
  getLanguageDisplayName,
  LANGUAGE_NAMES,
  LANGUAGE_CODES,
  type SupportedLanguage,
} from '@/lib/language/language-config';

describe('Language Configuration', () => {
  const originalEnv = process.env.PREFERRED_LANGUAGE;

  afterEach(() => {
    process.env.PREFERRED_LANGUAGE = originalEnv;
  });

  describe('getPreferredLanguage', () => {
    it('should return English by default', () => {
      delete process.env.PREFERRED_LANGUAGE;
      expect(getPreferredLanguage()).toBe('en');
    });

    it('should return PREFERRED_LANGUAGE from environment', () => {
      process.env.PREFERRED_LANGUAGE = 'th';
      expect(getPreferredLanguage()).toBe('th');
    });

    it('should handle case-insensitive environment variable', () => {
      process.env.PREFERRED_LANGUAGE = 'TH';
      expect(getPreferredLanguage()).toBe('th');
    });

    it('should default to English for invalid language', () => {
      process.env.PREFERRED_LANGUAGE = 'invalid';
      expect(getPreferredLanguage()).toBe('en');
    });

    it('should support all documented languages', () => {
      const languages: SupportedLanguage[] = ['en', 'th', 'zh', 'ja', 'es', 'fr', 'de', 'ko'];
      for (const lang of languages) {
        process.env.PREFERRED_LANGUAGE = lang;
        expect(getPreferredLanguage()).toBe(lang);
      }
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('th')).toBe(true);
      expect(isLanguageSupported('zh')).toBe(true);
      expect(isLanguageSupported('ja')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('invalid')).toBe(false);
      expect(isLanguageSupported('xx')).toBe(false);
    });
  });

  describe('getLanguageInstructionPrompt', () => {
    it('should return English instruction by default', () => {
      delete process.env.PREFERRED_LANGUAGE;
      const prompt = getLanguageInstructionPrompt();
      expect(prompt).toContain('English');
    });

    it('should return Thai instruction when language is set to th', () => {
      const prompt = getLanguageInstructionPrompt('th');
      expect(prompt).toContain('ไทย');
    });

    it('should return Chinese instruction when language is set to zh', () => {
      const prompt = getLanguageInstructionPrompt('zh');
      expect(prompt).toContain('中文');
    });

    it('should return Japanese instruction when language is set to ja', () => {
      const prompt = getLanguageInstructionPrompt('ja');
      expect(prompt).toContain('日本語');
    });

    it('should return Spanish instruction when language is set to es', () => {
      const prompt = getLanguageInstructionPrompt('es');
      expect(prompt).toContain('español');
    });

    it('should return French instruction when language is set to fr', () => {
      const prompt = getLanguageInstructionPrompt('fr');
      expect(prompt).toContain('français');
    });

    it('should return German instruction when language is set to de', () => {
      const prompt = getLanguageInstructionPrompt('de');
      expect(prompt).toContain('Deutsch');
    });

    it('should return Korean instruction when language is set to ko', () => {
      const prompt = getLanguageInstructionPrompt('ko');
      expect(prompt).toContain('한국어');
    });

    it('should respect parameter over environment variable', () => {
      process.env.PREFERRED_LANGUAGE = 'en';
      const prompt = getLanguageInstructionPrompt('th');
      expect(prompt).toContain('ไทย');
    });
  });

  describe('getLanguageDisplayName', () => {
    it('should return English by default', () => {
      delete process.env.PREFERRED_LANGUAGE;
      expect(getLanguageDisplayName()).toBe('English');
    });

    it('should return correct display names for all languages', () => {
      expect(getLanguageDisplayName('en')).toBe('English');
      expect(getLanguageDisplayName('th')).toBe('ไทย (Thai)');
      expect(getLanguageDisplayName('zh')).toBe('中文 (Chinese)');
      expect(getLanguageDisplayName('ja')).toBe('日本語 (Japanese)');
      expect(getLanguageDisplayName('es')).toBe('Español (Spanish)');
      expect(getLanguageDisplayName('fr')).toBe('Français (French)');
      expect(getLanguageDisplayName('de')).toBe('Deutsch (German)');
      expect(getLanguageDisplayName('ko')).toBe('한국어 (Korean)');
    });
  });

  describe('LANGUAGE_NAMES', () => {
    it('should contain all supported languages', () => {
      expect(Object.keys(LANGUAGE_NAMES)).toContain('en');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('th');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('zh');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('ja');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('es');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('fr');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('de');
      expect(Object.keys(LANGUAGE_NAMES)).toContain('ko');
    });
  });

  describe('LANGUAGE_CODES', () => {
    it('should contain language codes for all supported languages', () => {
      const languages: SupportedLanguage[] = ['en', 'th', 'zh', 'ja', 'es', 'fr', 'de', 'ko'];
      for (const lang of languages) {
        expect(LANGUAGE_CODES[lang]).toBeDefined();
        expect(LANGUAGE_CODES[lang]).toBe(lang);
      }
    });
  });
});
