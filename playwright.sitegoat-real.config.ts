import { defineConfig } from "@playwright/test";
import config from "./playwright.sitegoat.config";
export default defineConfig({
  ...config,
  testDir: "tests/local",
  testMatch: /sitegoat-real.spec.ts/,
  projects: config.projects!.map((p) => ({
    ...p,
    testMatch: /sitegoat-real.spec.ts/,
  })),
  outputDir: "test-results-sitegoat-real",
  webServer: [
    {command:"npm run preview",url:"http://127.0.0.1:4183",env:{JOURNAL360_TEST_PORT:"4183",JOURNAL360_ALLOW_CLOUD_LOCAL:"0",JOURNAL360_DIST_DIR:"dist"}},
    {command:"node tests/support/block-network.mjs",port:4198,env:{JOURNAL360_BLOCK_PORT:"4198"}},
  ],
});
