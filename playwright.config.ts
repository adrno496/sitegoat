import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4181",
    // Historical interaction scenarios retain their explicit interactive profile.
    // SG-04 separately tests a genuinely fresh profile without this preference.
    storageState: { cookies: [], origins: [{ origin: "http://127.0.0.1:4181", localStorage: [{name: "journal360.reader-default.v1", value: "interactive"}] }] },
    launchOptions: {
      proxy: { server: "http://127.0.0.1:4199", bypass: "127.0.0.1,localhost" },
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "chromium-mobile",
      testMatch: /(?:^|\/)(?:google-ai|v[6789])[^/]*\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "npm run preview",
      url: "http://127.0.0.1:4181",
      env: { JOURNAL360_TEST_PORT: "4181", JOURNAL360_ALLOW_CLOUD_LOCAL: "0" },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "node tests/support/block-network.mjs",
      port: 4199,
      reuseExistingServer: false,
      timeout: 10000,
    },
  ],
});
