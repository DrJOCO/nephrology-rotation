// Minimal flat config for the Cloud Functions workspace. Deliberately local
// (not the root config): the root rules target React/browser code and the
// retired-palette-token guard, neither of which applies to server code here.
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["lib", "node_modules"]),
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node globals used by the Admin SDK / test harness.
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      // Use the TS-aware variant: the base rule miscounts constructor parameter
      // properties (`public db`) and type-only usages as unused.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]);
