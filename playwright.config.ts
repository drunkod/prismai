import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // Forbid test.only on CI.
  forbidOnly: !!process.env.CI,
  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Configure projects for major browsers.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: [
    ['list'], // Standard console reporter
    ['html'], // Standard HTML reporter
    ['./e2e/jazz-reporter.js', { 
        syncUrl: 'ws://node205197-env-9764176354321.mircloud.host:11129', // IMPORTANT: Replace with your Jazz app key
    }]
  ],
  use: {
    // Collect trace when retrying the failed test.
    trace: "on-first-retry",
  },  
});
