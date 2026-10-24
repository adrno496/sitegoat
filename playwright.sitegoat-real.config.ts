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
});
