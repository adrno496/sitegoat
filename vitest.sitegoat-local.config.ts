import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/local/sitegoat-real.test.ts"],
    testTimeout: 60000,
    fileParallelism: false,
  },
});
