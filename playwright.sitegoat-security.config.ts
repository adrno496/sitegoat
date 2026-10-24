import { defineConfig } from "@playwright/test";
import config from "./playwright.sitegoat-personal.config";
export default defineConfig({
  ...config,
  testMatch: /sitegoat-security.spec.ts/,
  projects: config.projects!.map((p) => ({
    ...p,
    testMatch: /sitegoat-security.spec.ts/,
  })),
  outputDir: "test-results-sitegoat-security",
});
