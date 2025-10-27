// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright configuration for API testing
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  // Test directory
  testDir: './tests',
  
  // Maximum time one test can run for
  timeout: 30 * 1000,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // API testing specific settings
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'API Tests',
      testMatch: /.*\.spec\.js/,
    },
  ],
  
  // Run your local dev server before starting the tests
  // Note: We don't use this as the backend is started separately in CI
  // webServer: {
  //   command: 'npm run start',
  //   port: 3001,
  //   timeout: 120 * 1000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
