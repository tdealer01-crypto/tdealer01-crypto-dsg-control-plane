import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const runAgainstExternalBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const hasE2ETestCredentials = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  globalSetup: hasE2ETestCredentials ? './playwright/global-setup.ts' : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    storageState: hasE2ETestCredentials ? 'playwright/.auth/storageState.json' : undefined,
    ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
  },
  webServer: runAgainstExternalBaseUrl
    ? undefined
    : {
        command: 'ENABLE_DEMO_BOOTSTRAP=true DEMO_BOOTSTRAP_TOKEN=e2e NEXT_PUBLIC_DEMO_BOOTSTRAP_TOKEN=e2e npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
