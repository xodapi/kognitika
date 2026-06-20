import { defineConfig, devices } from '@playwright/test';

const localNoProxy = [
  '127.0.0.1',
  'localhost',
  '::1',
  ...(process.env.NO_PROXY || process.env.no_proxy || '').split(','),
]
  .map((value) => value.trim())
  .filter(Boolean);
const noProxy = [...new Set(localNoProxy)].join(',');

process.env.NO_PROXY = noProxy;
process.env.no_proxy = noProxy;

const e2ePort = Number(process.env.E2E_PORT || 4173);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${e2ePort}`;
const useExternalBaseURL = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Asia/Krasnoyarsk',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: useExternalBaseURL
    ? undefined
    : {
        command: 'pnpm start',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NO_PROXY: noProxy,
          no_proxy: noProxy,
          PORT: String(e2ePort),
          JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-replace-with-strong-secret',
          DATABASE_URL:
            process.env.DATABASE_URL ||
            'postgresql://admin:adminpassword@127.0.0.1:5432/cognitika?schema=public',
        },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
