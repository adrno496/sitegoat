import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  outputDir: "test-results-sitegoat",
  projects: config.projects!.map((p) => ({
    ...p,
    testMatch: /v9-sitegoat.spec.ts/,
  })),
  testMatch: /v9-sitegoat.spec.ts/,
  reporter: [["list"]],
  use: {
    ...config.use,
    baseURL: "http://127.0.0.1:4183",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:4183",
          localStorage: [
            { name: "journal360.reader-default.v1", value: "interactive" },
          ],
        },
      ],
    },
    launchOptions: {
      proxy: { server: "http://127.0.0.1:4198", bypass: "127.0.0.1,localhost" },
    },
  },
  webServer: [
    {
      command: "npm run preview",
      url: "http://127.0.0.1:4183",
      env: {
        JOURNAL360_TEST_PORT: "4183",
        JOURNAL360_ALLOW_CLOUD_LOCAL: "0",
        JOURNAL360_DIST_DIR: ".sitegoat-dist",
      },
      reuseExistingServer: false,
    },
    {
      command: "node tests/support/block-network.mjs",
      port: 4198,
      env: { JOURNAL360_BLOCK_PORT: "4198" },
    },
  ],
});
