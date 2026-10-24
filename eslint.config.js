import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".sitegoat-dist/**",
      "test-results-sitegoat/**",
      "test-results-sitegoat-real/**",
      "node_modules/**",
      "test-results/**",
      "test-results-*/**",
      "playwright-report/**",
      "api/**",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["server/**/*.mjs"],
    languageOptions: {
      globals: {
        URL: "readonly",
        URLSearchParams: "readonly",
        TextDecoder: "readonly",
        AbortSignal: "readonly",
      },
    },
  },
  { files: ["*.js"], languageOptions: { globals: { process: "readonly" } } },
);
