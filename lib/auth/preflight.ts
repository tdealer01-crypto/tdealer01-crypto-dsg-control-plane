export type PreflightErrorCode =
  | 'missing-supabase-url'
  | 'missing-anon-key'
  | 'missing-service-key'
  | 'missing-app-url';

export type PreflightWarningCode = 'missing-app-url';

type ValidateAuthConfigOptions = {
  requireAppUrl?: boolean;
};

export type PreflightResult = {
  ok: boolean;
  errors: Array<{ code: PreflightErrorCode; message: string }>;
  warnings: Array<{ code: PreflightWarningCode; message: string }>;
};

export function validateAuthConfig(options: ValidateAuthConfigOptions = {}): PreflightResult {
  const errors: PreflightResult['errors'] = [];
  const warnings: PreflightResult['warnings'] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push({
      code: 'missing-supabase-url',
      message: 'NEXT_PUBLIC_SUPABASE_URL is not set',
    });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    errors.push({
      code: 'missing-anon-key',
      message:
        'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set',
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push({
      code: 'missing-service-key',
      message: 'SUPABASE_SERVICE_ROLE_KEY is not set',
    });
  }

  if (!process.env.APP_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    const appUrlIssue = {
      code: 'missing-app-url' as const,
      message: 'APP_URL or NEXT_PUBLIC_APP_URL is not set',
    };

    if (options.requireAppUrl) {
      errors.push(appUrlIssue);
    } else {
      warnings.push({
        ...appUrlIssue,
        message: `${appUrlIssue.message} — falling back to request origin`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
