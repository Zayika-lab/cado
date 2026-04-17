import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npx http-server -p 5173 -c-1 -s .',
      url: 'http://127.0.0.1:5173/index.html',
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'npx firebase emulators:start --only auth,firestore,storage --project cado-test',
      url: 'http://127.0.0.1:4400/',
      reuseExistingServer: true,
      timeout: 90000,
    },
  ],
});
