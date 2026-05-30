import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Fail fast for CI, but allow more retries for flaky tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Timeout configuration
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Artifact configuration
  outputDir: 'test-results/artifacts',

  use: {
    baseURL,
    // Collect trace when retrying first failed test (captures networking, screenshots, etc)
    trace: 'on-first-retry',
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    // Record video only on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
