import { NextResponse } from 'next/server';
import { getPreferredLanguage, LANGUAGE_NAMES, LANGUAGE_CODES } from '@/lib/language/language-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/language
 *
 * Returns the current language configuration and list of supported languages
 */
export async function GET() {
  const currentLanguage = getPreferredLanguage();

  return NextResponse.json({
    current: currentLanguage,
    currentName: LANGUAGE_NAMES[currentLanguage],
    supported: Object.entries(LANGUAGE_CODES).map(([code, value]) => ({
      code: value,
      name: LANGUAGE_NAMES[code as keyof typeof LANGUAGE_NAMES],
    })),
    instruction: `To set a preferred language, set the PREFERRED_LANGUAGE environment variable to one of: ${Object.keys(LANGUAGE_CODES).join(', ')}`,
    examples: {
      english: 'PREFERRED_LANGUAGE=en',
      thai: 'PREFERRED_LANGUAGE=th',
      chinese: 'PREFERRED_LANGUAGE=zh',
      japanese: 'PREFERRED_LANGUAGE=ja',
    },
  });
}
