# Multi-Language Support for AI Agent Responses

The DSG Control Plane now supports AI agent responses in multiple languages. Users can choose their preferred language through environment configuration.

## Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| `en` | English | English |
| `th` | Thai | ไทย |
| `zh` | Chinese | 中文 |
| `ja` | Japanese | 日本語 |
| `es` | Spanish | Español |
| `fr` | French | Français |
| `de` | German | Deutsch |
| `ko` | Korean | 한국어 |

## Configuration

### Setting Your Preferred Language

Set the `PREFERRED_LANGUAGE` environment variable to your desired language code:

```bash
# English (default)
PREFERRED_LANGUAGE=en

# Thai
PREFERRED_LANGUAGE=th

# Chinese
PREFERRED_LANGUAGE=zh

# Japanese
PREFERRED_LANGUAGE=ja

# Spanish
PREFERRED_LANGUAGE=es

# French
PREFERRED_LANGUAGE=fr

# German
PREFERRED_LANGUAGE=de

# Korean
PREFERRED_LANGUAGE=ko
```

### Local Development

1. Update `.env.local` or `.env.development.local`:
   ```
   PREFERRED_LANGUAGE=th
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### Production Deployment

1. Set the environment variable in your deployment platform:
   - **Vercel**: Dashboard → Project Settings → Environment Variables
   - **Docker**: Pass as `--env PREFERRED_LANGUAGE=th` flag
   - **Traditional Server**: Set in `/etc/environment` or equivalent

2. Redeploy your application

## Checking Current Configuration

### Using the API

Check the current language configuration and available languages:

```bash
curl http://localhost:3000/api/config/language
```

Response:
```json
{
  "current": "en",
  "currentName": "English",
  "supported": [
    { "code": "en", "name": "English" },
    { "code": "th", "name": "ไทย (Thai)" },
    { "code": "zh", "name": "中文 (Chinese)" },
    { "code": "ja", "name": "日本語 (Japanese)" },
    { "code": "es", "name": "Español (Spanish)" },
    { "code": "fr", "name": "Français (French)" },
    { "code": "de", "name": "Deutsch (German)" },
    { "code": "ko", "name": "한국어 (Korean)" }
  ],
  "instruction": "To set a preferred language, set the PREFERRED_LANGUAGE environment variable to one of: en, th, zh, ja, es, fr, de, ko"
}
```

### Programmatically

In your Node.js code:

```typescript
import { getPreferredLanguage, getLanguageDisplayName } from '@/lib/language/language-config';

const currentLang = getPreferredLanguage(); // 'en', 'th', 'zh', etc.
const displayName = getLanguageDisplayName(); // 'English', 'ไทย (Thai)', etc.
```

## For AI Agent Developers

When integrating with AI models, use the language instruction prompt:

```typescript
import { getLanguageInstructionPrompt } from '@/lib/language/language-config';

const systemPrompt = `You are a helpful assistant.
${getLanguageInstructionPrompt()}`;
```

This will automatically include the appropriate language instruction based on the `PREFERRED_LANGUAGE` setting.

## Default Behavior

- **Default Language**: English (`en`)
- **Invalid Language**: If an unsupported language code is provided, the system defaults to English
- **Case Insensitive**: `PREFERRED_LANGUAGE=TH` is equivalent to `PREFERRED_LANGUAGE=th`

## Examples

### Run with Thai language (Local)

```bash
PREFERRED_LANGUAGE=th npm run dev
```

### Run with Chinese language (Docker)

```bash
docker run -e PREFERRED_LANGUAGE=zh dsg-control-plane:latest
```

### Multiple Deployments

If you have multiple deployment environments:

```bash
# Staging (Thai)
PREFERRED_LANGUAGE=th vercel --prod --scope staging

# Production (English - default)
PREFERRED_LANGUAGE=en vercel --prod --scope production
```

## Adding More Languages

To add support for a new language:

1. Edit `lib/language/language-config.ts`
2. Add the language code to the `SupportedLanguage` type
3. Add entries to `LANGUAGE_NAMES` and `LANGUAGE_CODES`
4. Add an instruction in `getLanguageInstructionPrompt()`
5. Add tests in `tests/unit/language/language-config.test.ts`
6. Update this documentation

Example:

```typescript
// lib/language/language-config.ts
export type SupportedLanguage = 'en' | 'th' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko' | 'pt'; // Added 'pt'

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  // ... existing entries
  pt: 'Português (Portuguese)',
};

export const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  // ... existing entries
  pt: 'pt',
};

// In getLanguageInstructionPrompt()
const instructions: Record<SupportedLanguage, string> = {
  // ... existing entries
  pt: 'Responda em português. (Respond in Portuguese)',
};
```

## Testing

Run the language configuration tests:

```bash
npm test -- tests/unit/language/language-config.test.ts
```

Expected output: All 20 tests should pass.

## Troubleshooting

### "PREFERRED_LANGUAGE not being applied"

1. Verify the environment variable is set correctly:
   ```bash
   echo $PREFERRED_LANGUAGE
   ```

2. Check if it's a valid language code (case-insensitive):
   - Supported: `en`, `th`, `zh`, `ja`, `es`, `fr`, `de`, `ko`
   - Invalid: `thai`, `th-TH`, `Chinese` (must be lowercase code)

3. Restart the application after changing the environment variable

### "Getting English responses when Thai is set"

1. Verify environment variable is correctly set
2. Check `/api/config/language` endpoint to confirm the current setting
3. Restart the application
4. Check application logs for any errors

### "Language not supported"

The supported languages are documented in the "Supported Languages" section. If you need a different language, follow the "Adding More Languages" section.

## References

- Environment variable documentation: See `.env.example`
- API endpoint: `GET /api/config/language`
- Configuration module: `lib/language/language-config.ts`
- Tests: `tests/unit/language/language-config.test.ts`
