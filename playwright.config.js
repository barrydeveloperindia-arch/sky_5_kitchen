import { defineConfig, devices } from '@playwright/test';

const PORT = 5179;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  fullyParallel: true,
  retries: 0,
  // the machine also runs other projects' tests at night; 10 s per check keeps a slow moment from failing a run
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /smoke|shop|inventory-staff|staff-attendance/ },
  ],
  webServer: [
    {
      // Local Firebase (auth + Firestore with the real security rules); never touches live data
      command: 'firebase emulators:start --only auth,firestore --project demo-hotel-sky5',
      url: 'http://127.0.0.1:8181',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      // the live board is replaced in tests (routes in the specs); an unanswered call just fails quietly
      env: { VITE_FIREBASE_EMULATOR: '1', VITE_STAFF_TERMINAL: '1', VITE_SKY5_BOARD_URL: 'http://board.test', VITE_SKY5_BOARD_KEY: 'test-key' },
    },
  ],
});
